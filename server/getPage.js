import path from 'node:path';
import fs from 'node:fs';
import {
  __dirname,
  root,
  publicDirectory,
  publicURLPath,
  ssrDirectory,
  publicDirectoryRelative
} from './paths.js';

const isProduction = process.env.NODE_ENV === 'production';

function getPaths(pageName) {
  return {
    source: {
      jsFile: `client/pages/${pageName}/${pageName}.page.jsx`,
      cssFile: `client/pages/${pageName}/${pageName}.page.css`
    },
    ssr: {
      jsFile: `${ssrDirectory}/pages/${pageName}/${pageName}.page.js`
    }
  };
}

function getRelativePathToSSRDist(distSSRPath) {
  return path.relative(__dirname, path.resolve(root, distSSRPath));
}

let manifestCache;
let metafileCache;
async function getPage(pageName, hostname) {
  const filePaths = getPaths(pageName);

  // Map from server manifest and metafile
  // Cache manifest and metafile if not cached
  let manifest = manifestCache;
  let metafile = metafileCache;
  if (!manifest) {
    const [
      manifestString,
      metafileString
    ] = await Promise.all([
      fs.promises.readFile(
        path.resolve(publicDirectory, 'manifest.json'),
        'utf-8'
      ),
      fs.promises.readFile(
        path.resolve(publicDirectory, 'metafile.json'),
        'utf-8'
      )
    ]);
    manifest = JSON.parse(manifestString);
    metafile = JSON.parse(metafileString);
    if (isProduction) {
      manifestCache = manifest;
      metafileCache = metafile;
    }
  }

  const jsFile = manifest[filePaths.source.jsFile];
  const cssFile = manifest[filePaths.source.cssFile];
  const preloadJs = (metafile.outputs[jsFile].imports || [])
    .filter(({ kind }) => kind === 'import-statement')
    .map(({ path: filePath }) => path.resolve(publicURLPath, path.relative(publicDirectoryRelative, filePath)));
  const exports = await import(getRelativePathToSSRDist(filePaths.ssr.jsFile));
  const liveReloadScript = isProduction
    ? undefined
    : `http://${hostname.split(':')[0]}:35729/livereload.js?snipver=1`;

  return {
    js: `${publicURLPath}/${path.relative(publicDirectory, jsFile)}`,
    preloadJs,
    css: `${publicURLPath}/${path.relative(publicDirectory, cssFile)}`,
    exports,
    liveReloadScript
  };
}

export default getPage;
