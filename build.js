import { build } from 'esbuild';
import glob from 'tiny-glob';
import rimraf from 'rimraf';
import copy from 'cpy';
import manifestPlugin from 'esbuild-plugin-manifest';
import {
  publicDirectoryRelative,
  ssrDirectoryRelative,
  nonIslandMinDirectoryRelative,
  publicURLPath,
  publicDirectory
} from './server/paths.js';
import { promises } from 'node:fs';

const clientOutBase = 'client/';

const [ssrEntryPoints, clientEntryPoints] = await Promise.all([
  glob(`${clientOutBase}/pages/**/*.page.jsx`),
  glob(`${clientOutBase}/pages/**/*.islands.jsx`),
  // clean current dist/
  rimraf(publicDirectoryRelative),
  rimraf(ssrDirectoryRelative),
  rimraf(nonIslandMinDirectoryRelative)
]);
// console.log('entryPoints', entryPoints);

const commonConfig = {
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
    entryPoints: clientEntryPoints,
    outbase: clientOutBase,
    outdir: publicDirectoryRelative,
    splitting: true,
    minify: true,
    plugins: [manifestPlugin()],
    metafile: true,
    ...commonConfig
  }),
  build({
    entryPoints: ssrEntryPoints,
    outbase: clientOutBase,
    outdir: ssrDirectoryRelative,
    splitting: false,
    minify: false,
    external: ['preact', 'preact-render-to-string'],
    ...commonConfig
  })
]);

const [cssEntryFiles] = await Promise.all([
  glob(`${ssrDirectoryRelative}**/*.page.css`),
  result && result.metafile
    ? promises.writeFile(`${publicDirectory}/metafile.json`, JSON.stringify(result.metafile, 0, 2))
    : null
]);

await build({
  entryPoints: cssEntryFiles,
  outbase: ssrDirectoryRelative,
  outdir: nonIslandMinDirectoryRelative,
  bundle: true,
  splitting: false,
  minify: true,
  plugins: [manifestPlugin()],
  metafile: true,
  external: ['preact', 'preact-render-to-string'],
  ...commonConfig
});

await Promise.all([
  copy([
  `../../${ssrDirectoryRelative}**/*.*`,
  `!../../${ssrDirectoryRelative}**/*.(js|css)(.map)?`,
  `../../${nonIslandMinDirectoryRelative}**/*.css(.map)?`
  ], '.', {
    cwd: publicDirectory
  }),
  rimraf(`./${publicDirectoryRelative}**/*.islands-*.css`, { glob: true }),
  rimraf(`./${publicDirectoryRelative}**/*.islands-*.css.map`, { glob: true })
]);
