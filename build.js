import { build, context } from 'esbuild';
import glob from 'tiny-glob';
import chokidar from 'chokidar';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import rimraf from 'rimraf';
import {
  publicDirectoryRelative,
  ssrDirectoryRelative,
  publicURLPath,
  publicDirectory,
  ssrDirectory
} from './server/paths.js';
import { promises as fs } from 'node:fs';

const {
  values: {
    dev: isDevMode,
    watch
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
    }
  }
});

const [entryPoints] = await Promise.all([
  glob('./client/pages/**/*.page.jsx'),
  // clean current dist/
  rimraf('dist/')
]);
// console.log('entryPoints', entryPoints);

const commonConfig = {
  entryPoints,
  entryNames: '[dir]/[name]-[hash]',
  outbase: 'client/',
  publicPath: publicURLPath,
  format: 'esm',
  bundle: true,
  metafile: true,
  loader: {
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.webp': 'file'
  },
  resolveExtensions: ['.jsx', '.ts', '.tsx'],
  jsxImportSource: 'preact',
  jsx: 'automatic'
};

// Why 2 builds?
// 1. Client side build - JS, CSS, images etc for the client side
// 2. SSR build - Non-minified full page JS for server side for better stack traces
// And also because preact-render-to-string includes node.js copy of preact. If you don't exclude preact from the build,
// you would cause two preact copies (one in the bundled JS and one from preact-render-to-string)
// Also note, using hashed SSR files just like client build, so that server can dynamic import() changes without restarting full server
const publicBuildConfig = {
  outdir: publicDirectoryRelative,
  splitting: true,
  minify: true,
  sourcemap: true,
  ...commonConfig
};
const serverBuildConfig = {
  outdir: ssrDirectoryRelative,
  splitting: false,
  minify: false,
  sourcemap: 'inline',
  sourcesContent: isDevMode,
  external: ['preact', 'preact-render-to-string'],
  ...commonConfig
};

const [publicBuildResult, ssrBuildResult] = await Promise.all([
  build(publicBuildConfig),
  build(serverBuildConfig)
]);

async function writeMetafile(publicBuildResult, ssrBuildResult) {
  if (publicBuildResult && publicBuildResult.metafile) {
    await Promise.all([
      fs.writeFile(`${publicDirectory}/metafile.json`, JSON.stringify(publicBuildResult.metafile, 0, 2)),
      fs.writeFile(`${ssrDirectory}/metafile.json`, JSON.stringify(ssrBuildResult.metafile, 0, 2))
    ]);
  }
}

await writeMetafile(publicBuildResult, ssrBuildResult);

if (watch) {
  const watchGlob = 'client/';
  // mimicking nodemon logs
  console.debug(`watching path: ${watchGlob}`);
  console.debug(`watching extensions: (all)`);
  const [ctx1, ctx2] = await Promise.all([
    context(publicBuildConfig),
    context(serverBuildConfig)
  ]);

  let rebuildTimer;
  const rebuildThrottle = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(incrementalRebuild, 50);
  };

  const incrementalRebuild = async () => {
    const startTime = performance.now();
    const [publicBuildResult, ssrBuildResult] = await Promise.all([
      ctx1.rebuild(),
      ctx2.rebuild()
    ]);
    await writeMetafile(publicBuildResult, ssrBuildResult);
    console.log(`rebuilt in ${(performance.now() - startTime).toFixed(2)} ms`);
  };

  chokidar
    .watch(watchGlob, {
      ignoreInitial: true
    })
    .on('all', rebuildThrottle);
}
