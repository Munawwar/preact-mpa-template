import { defineConfig } from '@rsbuild/core';
import { commonConfig } from './rsbuild-common.config.js';

// Client build configuration
export default defineConfig({
  ...commonConfig,

  output: {
    ...commonConfig.output,
    distPath: {
      root: 'dist/public'
    },
    assetPrefix: '/public/'
  },

  performance: {
    chunkSplit: {
      strategy: 'split-by-module'
    }
  },

  server: {
    hmr: true,
    middlewareMode: true
  }
});
