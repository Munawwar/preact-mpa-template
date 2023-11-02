import { build } from 'esbuild';
import glob from 'tiny-glob';
import rimraf from 'rimraf';
import {
  publicDirectoryRelative,
  ssrDirectoryRelative,
  publicURLPath,
  publicDirectory,
  ssrDirectory
} from './server/paths.js';
import { promises as fs } from 'node:fs';

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

const [result1, result2] = await Promise.all([
  build({
    outdir: publicDirectoryRelative,
    splitting: true,
    minify: true,
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

if (result1 && result1.metafile) {
  await Promise.all([
    fs.writeFile(`${publicDirectory}/metafile.json`, JSON.stringify(result1.metafile, 0, 2)),
    fs.writeFile(`${ssrDirectory}/metafile.json`, JSON.stringify(result2.metafile, 0, 2))
  ]);
}
