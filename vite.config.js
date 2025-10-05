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

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [preact()],

    // Client build configuration
    build: {
      outDir: 'dist/client',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        input: findHtmlEntries()
      },
      // Generate source maps for production debugging
      sourcemap: !isProduction
    },

    // Development server configuration
    server: {
      middlewareMode: true,
      hmr: {
        port: 24678
      }
    },

    // SSR configuration (used when building with --ssr flag)
    ssr: {
      // Don't bundle these for SSR
      external: ['preact', 'preact-render-to-string'],
      // SSR build output
      outDir: 'dist/server'
    },

    // Resolve configuration
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.json']
    },

    // Public base path
    base: '/'
  };
});
