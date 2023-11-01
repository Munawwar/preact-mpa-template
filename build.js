import { build } from 'esbuild';
import glob from 'tiny-glob';
import rimraf from 'rimraf';
import {
  publicDirectoryRelative,
  ssrDirectoryRelative,
  publicURLPath,
  publicDirectory
} from './server/paths.js';
import fs from 'node:fs';

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

const [result] = await Promise.all([
  build({
    outdir: publicDirectoryRelative,
    splitting: true,
    minify: true,
    entryNames: '[dir]/[name]-[hash]',
    metafile: true,
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

if (result && result.metafile) {
  fs.writeFileSync(`${publicDirectory}/metafile.json`, JSON.stringify(result.metafile, 0, 2));
}
