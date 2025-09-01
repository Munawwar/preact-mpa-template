import { createRsbuild } from '@rsbuild/core';
import { parseArgs } from 'node:util';
import { promises as fsPromises } from 'node:fs';

const {
  values: {
    dev: isDevMode,
    watch,
    'ssr-only': ssrOnly
  }
} = parseArgs({
  options: {
    dev: {
      type: 'boolean',
      default: false
    },
    watch: {
      type: 'boolean',
      default: false
    },
    'ssr-only': {
      type: 'boolean',
      default: false
    }
  }
});

// In dev mode, automatically enable watch and don't make SSR-only
const shouldWatch = watch || isDevMode;
const shouldSkipClient = ssrOnly && !isDevMode;

// Build configuration
console.log('🚀 Starting build...');

// Import the clean configs
const { default: clientConfig } = await import('./rsbuild.config.js');
const { default: ssrConfig } = await import('./rsbuild-ssr.config.js');

// Clean dist directory
await fsPromises.rm('dist/', { recursive: true, force: true });

// Production build function
async function build() {
  const buildPromises = [];

  // Add client build unless SSR-only
  if (!shouldSkipClient) {
    console.log('📦 Building client assets...');
    const clientRsbuild = await createRsbuild({ rsbuildConfig: clientConfig });
    buildPromises.push(clientRsbuild.build());
  }

  // Always build SSR
  console.log('🔧 Building SSR assets...');
  const ssrRsbuild = await createRsbuild({ rsbuildConfig: ssrConfig });
  buildPromises.push(ssrRsbuild.build());

  const results = await Promise.all(buildPromises);
  console.log('✅ Build completed successfully!');

  const clientResult = shouldSkipClient ? null : results[0];
  const ssrResult = shouldSkipClient ? results[0] : results[1];

  console.log('Client build outputs:', clientResult?.outputFiles || []);
  console.log('SSR build outputs:', ssrResult?.outputFiles || []);
}

// Watch mode function
async function buildWithWatch() {
  // Perform initial build to ensure files exist
  console.log('👀 Starting build with watch mode...');
  console.log('🔨 Performing initial builds...');
  await build();

  const builders = [];

  // Add client build unless SSR-only
  if (!shouldSkipClient) {
    console.log('📦 Setting up client build watcher...');
    const clientRsbuild = await createRsbuild({ rsbuildConfig: clientConfig });
    const clientWatcher = await clientRsbuild.startDevServer();
    builders.push(clientWatcher);
  }

  // Always build SSR
  console.log('🔧 Setting up SSR build watcher...');
  const ssrRsbuild = await createRsbuild({ rsbuildConfig: ssrConfig });
  const ssrWatcher = await ssrRsbuild.startDevServer();
  builders.push(ssrWatcher);

  console.log('✅ Watch mode started!');

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down watchers...');
    builders.forEach(builder => builder.close?.());
    process.exit(0);
  });
}

// Run the build
if (shouldWatch) {
  await buildWithWatch();
} else {
  await build();
}
