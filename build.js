import { build } from 'esbuild';
import glob from 'tiny-glob';
import rimraf from 'rimraf';
import manifestPlugin from 'esbuild-plugin-manifest';
import {
  publicDirectoryRelative,
  ssrDirectoryRelative,
  publicURLPath
} from './server/paths.js';

const [entryPoints] = await Promise.all([
  glob('./client/pages/**/*.page.jsx'),
  // clean current dist/
  rimraf('dist/')
]);
// console.log('entryPoints', entryPoints);

const commonConfig = {
  entryPoints,
  outbase: 'client/',
  publicPath: publicURLPath,
  format: 'esm',
  bundle: true,
  sourcemap: true,
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

await Promise.all([
  build({
    outdir: publicDirectoryRelative,
    splitting: true,
    minify: true,
    plugins: [manifestPlugin()],
    ...commonConfig
  }),
  build({
    outdir: ssrDirectoryRelative,
    splitting: false,
    minify: false,
    external: ['preact', 'preact-render-to-string'],
    ...commonConfig
  })
]);
