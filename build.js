import * as esbuild from 'esbuild';
import glob from 'tiny-glob';
import { parseArgs } from 'node:util';
import rimraf from 'rimraf';

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

const cleanPromise = rimraf('dist/');

const clientEntryPointsPromise = prod ? glob('./client/pages/**/*.{js,jsx}') : null;
const [
  clientEntryPoints,
  serverEntryPoints
] = await Promise.all([
  clientEntryPointsPromise,
  glob('./client/**/*.{js,jsx}'),
  cleanPromise
]);

const commonConfig = {
  format: 'esm',
  jsxImportSource: 'preact',
  jsx: 'automatic',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  resolveExtensions: ['.jsx', '.ts', '.tsx']
};

console.log('serverEntryPoints', serverEntryPoints);
await Promise.all([
  // Client build
  prod
    ? esbuild.build({
      entryPoints: clientEntryPoints,
      outdir: 'dist/client/',
      outbase: 'client/',
      ...commonConfig,
      bundle: true,
      minify: true
    })
    : null,
  // Server build
  esbuild.build({
    entryPoints: serverEntryPoints,
    outdir: 'dist/server/',
    outbase: 'client/',
    ...commonConfig,
    platform: 'node'
  })
]);
