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
  sourcesContent: false,
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

// Why 2 builds?
// 1. Client side build - JS, CSS, images etc for the client side
// 2. SSR build - Non-minified full page JS for server side for better stack traces
// And also because preact-render-to-string includes node.js copy of preact. If you don't exclude preact from the build,
// you would cause two preact copies (one in the bundled JS and one from preact-render-to-string)
// Also note, using hashed SSR files just like client build, so that server can dynamic import() changes without restarting full server
const [publicBuildResult, ssrBuildResult] = await Promise.all([
  build({
    outdir: publicDirectoryRelative,
    splitting: true,
    minify: true,
    sourcemap: true,
    ...commonConfig
  }),
  build({
    outdir: ssrDirectoryRelative,
    splitting: false,
    minify: false,
    sourcemap: 'inline',
    external: ['preact', 'preact-render-to-string'],
    ...commonConfig
  })
]);

if (publicBuildResult && publicBuildResult.metafile) {
  await Promise.all([
    fs.writeFile(`${publicDirectory}/metafile.json`, JSON.stringify(publicBuildResult.metafile, 0, 2)),
    fs.writeFile(`${ssrDirectory}/metafile.json`, JSON.stringify(ssrBuildResult.metafile, 0, 2))
  ]);
}
