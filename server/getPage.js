import path from 'node:path';
import fs from 'node:fs';
import {
  __dirname,
  root,
  staticDirectory,
  publicURLPath,
  ssrDirectory
} from './paths.js';
import shallowImportAnalyzer from './shallowImportAnalyzer.js';

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

let manifest;
async function getPage(pageName, hostname) {
  const filePaths = getPaths(pageName);
  // Map from server manifest
  // Cache manifest if not cached
  if (!manifest) {
    manifest = JSON.parse(
      await fs.promises.readFile(
        path.resolve(staticDirectory, `manifest.json`),
        'utf-8'
      )
    );
  }

  const jsFile = manifest[filePaths.source.jsFile];
  const cssFile = manifest[filePaths.source.cssFile];
  const liveReloadScript = isProduction
    ? undefined
    : `http://${hostname.split(':')[0]}:35729/livereload.js?snipver=1`;

  const [
    exports,
    preloadJs
  ] = await Promise.all([
    import(getRelativePathToSSRDist(filePaths.ssr.jsFile)),
    shallowImportAnalyzer(jsFile)
  ]);
  return {
    js: `${publicURLPath}/${path.relative(staticDirectory, jsFile)}`,
    preloadJs,
    css: `${publicURLPath}/${path.relative(staticDirectory, cssFile)}`,
    exports,
    liveReloadScript
  };
}

export default getPage;
