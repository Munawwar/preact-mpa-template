import { defineConfig } from '@rsbuild/core';
import { commonConfig } from './rsbuild-common.config.js';

// SSR build configuration
export default defineConfig({
  ...commonConfig,

  output: {
    ...commonConfig.output,
    target: 'node',
    module: true,
    distPath: {
      root: 'dist/ssr'
    },
    externals: {
      preact: 'preact',
      'preact-render-to-string': 'preact-render-to-string'
    }
  }
});
