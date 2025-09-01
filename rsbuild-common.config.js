import { pluginPreact } from '@rsbuild/plugin-preact';
import glob from 'tiny-glob';

// Get all page entry points
const entryPoints = await glob('./client/pages/**/*.page.jsx');

// Convert glob array to entry object for rsbuild
const entry = {};
entryPoints.forEach(entryPoint => {
  // Convert './client/pages/home/home.page.jsx' to 'pages/home/home.page'
  const key = entryPoint
    .replace('./client/', '')
    .replace('.jsx', '');
  // Ensure the entry point has proper relative path with ./ prefix
  const fixedPath = entryPoint.startsWith('./') ? entryPoint : `./${entryPoint}`;
  entry[key] = fixedPath;
});

// Common configuration shared between client and SSR builds
export const commonConfig = {
  plugins: [pluginPreact()],

  source: {
    entry
  },

  output: {
    filename: {
      js: '[name]-[hash].js',
      css: '[name]-[hash].css'
    },
    manifest: true
  },

  resolve: {
    alias: {
      '@': './client'
    }
  },

  html: {
    // Disable HTML generation since we're doing SSR
    template: false
  }
};

export { entry };
