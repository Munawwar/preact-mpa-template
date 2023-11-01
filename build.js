import { build, context } from 'esbuild';
import glob from 'tiny-glob';
import chokidar from 'chokidar';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import rimraf from 'rimraf';
import {
  publicDirectoryRelative,
  ssrDirectoryRelative,
  publicURLPath,
  publicDirectory,
  ssrDirectory
} from './server/paths.js';
import { promises as fs } from 'node:fs';

const { values: { watch } } = parseArgs({
  options: {
    watch: {
      type: 'boolean',
      default: false
    }
  }
});

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

const clientBuildConfig = {
  outdir: publicDirectoryRelative,
  splitting: true,
  minify: true,
  entryNames: '[dir]/[name]-[hash]',
  metafile: true,
  ...commonConfig
};
const serverBuildConfig = {
  outdir: ssrDirectoryRelative,
  splitting: false,
  minify: false,
  external: ['preact', 'preact-render-to-string'],
  ...commonConfig
};

const [result1, result2] = await Promise.all([
  build(clientBuildConfig),
  build(serverBuildConfig)
]);

async function writeMetafile(result1, result2) {
  if (result1 && result1.metafile) {
    await Promise.all([
      fs.writeFile(`${publicDirectory}/metafile.json`, JSON.stringify(result1.metafile, 0, 2)),
      fs.writeFile(`${ssrDirectory}/metafile.json`, JSON.stringify(result2.metafile, 0, 2))
    ]);
  }
}

writeMetafile(result1, result2);

if (watch) {
  const watchGlob = 'client/';
  // mimicking nodemon logs
  console.debug(`watching path: ${watchGlob}`);
  console.debug(`watching extensions: (all)`);
  const [ctx1, ctx2] = await Promise.all([
    context(clientBuildConfig),
    context(serverBuildConfig)
  ]);

  chokidar
    .watch(watchGlob, {
      ignoreInitial: true
    })
    .on('all', async () => {
      const startTime = performance.now();
      const [result1, result2] = await Promise.all([
        ctx1.rebuild(),
        ctx2.rebuild()
      ]);
      writeMetafile(result1, result2);
      console.log(`rebuilt in ${(performance.now() - startTime).toFixed(2)} ms`);
    });
}
