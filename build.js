import { build } from 'esbuild';
import glob from 'tiny-glob';
import { parseArgs } from 'node:util';
import rimraf from 'rimraf';
import manifestPlugin from 'esbuild-plugin-manifest';

const {
  values: {
    prod
  }
} = parseArgs({
  values: process.argv,
  options: {
    prod: {
      type: 'boolean'
    }
  }
});

let [entryPoints] = await Promise.all([
  glob('./client/pages/**/*.page.jsx'),
  // clean current dist/
  rimraf('dist/')
]);
entryPoints = ['./client/renderToString.jsx'].concat(entryPoints);
// console.log('entryPoints', entryPoints);

await build({
  entryPoints,
  outdir: 'dist/',
  outbase: 'client/',
  format: 'esm',
  bundle: true,
  sourcemap: true,
  splitting: true,
  minify: true,
  plugins: prod ? [manifestPlugin()] : [],
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
})
