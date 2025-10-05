import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve, join } from 'node:path';
import { readdirSync, statSync, copyFileSync } from 'node:fs';
import { publicURLPath } from './server/paths';

// Plugin to copy template.html to dist
function copyTemplatePlugin() {
  return {
    name: 'copy-template',
    closeBundle() {
      const src = resolve(__dirname, 'client/template.html');
      const dest = resolve(__dirname, 'dist/client/template.html');
      copyFileSync(src, dest);
    }
  };
}

// Find all .page.jsx files for client and SSR builds
function findPageEntries() {
  const pagesDir = resolve(__dirname, 'client/pages');
  const entries = {};

  try {
    const pageNames = readdirSync(pagesDir);

    for (const pageName of pageNames) {
      const pagePath = join(pagesDir, pageName);
      if (statSync(pagePath).isDirectory()) {
        const pageFile = join(pagePath, `${pageName}.page.jsx`);
        try {
          statSync(pageFile);
          entries[`pages/${pageName}/${pageName}.page`] = resolve(__dirname, pageFile);
        } catch (err) {
          // Page file doesn't exist
        }
      }
    }
  } catch (err) {
    console.warn('Could not read pages directory:', err.message);
  }

  return entries;
}

export default defineConfig(({ mode, isSsrBuild }) => {
  const isProduction = mode === 'production';

  // Common configuration shared between client and SSR builds
  const commonConfig = {
    plugins: [preact()],
    // Public base path - all assets will be served from /public/
    base: publicURLPath,
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.json']
    },
    build: {
      assetsInlineLimit: 0, // Don't inline assets as data URIs
      sourcemap: !isProduction
    }
  };

  // SSR build configuration
  if (isSsrBuild) {
    return {
      ...commonConfig,
      build: {
        ...commonConfig.build,
        ssr: true,
        outDir: 'dist/server',
        emptyOutDir: true,
        rollupOptions: {
          input: findPageEntries(),
          output: {
            entryFileNames: '[name].js',
            format: 'es'
          }
        }
      },
      ssr: {
        external: ['preact', 'preact-render-to-string'],
        noExternal: []
      }
    };
  }

  // Client build configuration
  return {
    ...commonConfig,
    plugins: [preact(), copyTemplatePlugin()],

    // Public directory - files copied to dist/client root
    publicDir: 'public',

    build: {
      ...commonConfig.build,
      outDir: 'dist/client',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: findPageEntries(),
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },

    // Development server configuration
    server: {
      middlewareMode: true,
      hmr: {
        port: 24678
      }
    },
  };
});
