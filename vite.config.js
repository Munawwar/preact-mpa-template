import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve, join } from 'node:path';
import { readdirSync, statSync } from 'node:fs';

// Find all HTML entry files in client/pages/*/*.html
function findHtmlEntries() {
  const pagesDir = resolve(__dirname, 'client/pages');
  const entries = {};

  try {
    const pageNames = readdirSync(pagesDir);

    for (const pageName of pageNames) {
      const pagePath = join(pagesDir, pageName);
      if (statSync(pagePath).isDirectory()) {
        const htmlFile = join(pagePath, `${pageName}.html`);
        try {
          statSync(htmlFile);
          entries[pageName] = resolve(__dirname, htmlFile);
        } catch (err) {
          // HTML file doesn't exist for this page yet
        }
      }
    }
  } catch (err) {
    console.warn('Could not read pages directory:', err.message);
  }

  return entries;
}

// Find all .page.jsx files for SSR build
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

  // SSR build configuration
  if (isSsrBuild) {
    return {
      plugins: [preact()],
      build: {
        ssr: true,
        outDir: 'dist/server',
        emptyOutDir: true,
        rollupOptions: {
          input: findPageEntries(),
          output: {
            entryFileNames: '[name].js',
            format: 'es'
          }
        },
        sourcemap: !isProduction
      },
      ssr: {
        external: ['preact', 'preact-render-to-string'],
        noExternal: []
      },
      resolve: {
        extensions: ['.mjs', '.js', '.jsx', '.json']
      }
    };
  }

  // Client build configuration
  return {
    plugins: [preact()],

    // Public directory - files copied to dist/client root
    publicDir: 'public',

    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: findHtmlEntries()
      },
      sourcemap: !isProduction
    },

    // Development server configuration
    server: {
      middlewareMode: true,
      hmr: {
        port: 24678
      }
    },

    // Resolve configuration
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.json']
    },

    // Public base path - all assets will be served from /public/
    base: '/public/'
  };
});
