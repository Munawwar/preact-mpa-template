import path from 'node:path';
import fs from 'node:fs';
import {
  root,
  publicDirectory,
  publicURLPath,
  nonIslandMinDirectory,
  publicDirectoryRelative,
  ssrDirectoryRelative
} from './paths.js';

const isProduction = process.env.NODE_ENV === 'production';

function getPaths(pageName) {
  return {
    source: {
      jsFile: `client/pages/${pageName}/${pageName}.islands.jsx`
    },
    ssr: {
      jsFile: `${ssrDirectoryRelative}/pages/${pageName}/${pageName}.page.js`,
      cssFile: `${ssrDirectoryRelative}pages/${pageName}/${pageName}.page.css`
    }
  };
}

function getRelativePathToSSRDist(distSSRPath) {
  return path.resolve(root, distSSRPath);
}

let publicManifestCache;
let ssrMinManifestCache;
let metafileCache;
async function getPage(pageName, hostname) {
  const filePaths = getPaths(pageName);

  // Map from server manifest and metafile
  // Cache manifest and metafile if not cached
  let publicManifest = publicManifestCache;
  let ssrMinManifest = ssrMinManifestCache;
  let metafile = metafileCache;
  if (!publicManifest) {
    const [
      publicManifestString,
      ssrMinManifestString,
      metafileString
    ] = await Promise.all([
      fs.promises.readFile(
        path.resolve(publicDirectory, 'manifest.json'),
        'utf-8'
      ),
      fs.promises.readFile(
        path.resolve(nonIslandMinDirectory, 'manifest.json'),
        'utf-8'
      ),
      fs.promises.readFile(
        path.resolve(publicDirectory, 'metafile.json'),
        'utf-8'
      )
    ]);
    publicManifest = JSON.parse(publicManifestString);
    ssrMinManifest = JSON.parse(ssrMinManifestString);
    metafile = JSON.parse(metafileString);
    if (isProduction) {
      publicManifestCache = publicManifest;
      ssrMinManifestCache = ssrMinManifest;
      metafileCache = metafile;
    }
  }

  const jsFile = publicManifest[filePaths.source.jsFile];
  // CSS files contain full page CSS, with manifest in the nonIslandMinDirectory (but copied over to public directory)
  const cssFile = ssrMinManifest[filePaths.ssr.cssFile];
  const preloadJs = (metafile.outputs[jsFile]?.imports || [])
    .filter(({ kind }) => kind === 'import-statement')
    .map(({ path: filePath }) => path.resolve(publicURLPath, path.relative(publicDirectoryRelative, filePath)));
  const exports = await import(getRelativePathToSSRDist(filePaths.ssr.jsFile));
  const liveReloadScript = isProduction
    ? undefined
    : `http://${hostname.split(':')[0]}:35729/livereload.js?snipver=1`;

  return {
    js: jsFile ? `${publicURLPath}/${path.relative(publicDirectory, jsFile)}` : '',
    preloadJs,
    css: `${publicURLPath}/${path.relative(nonIslandMinDirectory, cssFile)}`,
    exports,
    liveReloadScript
  };
}

export default getPage;
