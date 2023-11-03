import path from 'node:path';
import { promises as fs } from 'node:fs';
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
    jsFile: `client/pages/${pageName}/${pageName}.page.jsx`,
    cssFile: `client/pages/${pageName}/${pageName}.page.css`
  };
}

function getRelativePathToSSRDist(distSSRPath) {
  return path.relative(__dirname, path.resolve(root, distSSRPath));
}

let manifestsCache;
let metafilesCache;
async function getPage(pageName, hostname) {
  const filePaths = getPaths(pageName);

  // Map from build meta files
  let metafiles = metafilesCache;
  // Construct and cache manifests if not cached
  let manifests = manifestsCache;
  if (!manifests) {
    const [publicMetafileString, ssrMetafileString] = await Promise.all([
      fs.readFile(
        path.resolve(publicDirectory, 'metafile.json'),
        'utf-8'
      ),
      fs.readFile(
        path.resolve(ssrDirectory, 'metafile.json'),
        'utf-8'
      )
    ]);
    metafiles = {
      public: JSON.parse(publicMetafileString),
      ssr: JSON.parse(ssrMetafileString)
    };
    // Reverse map source file to output JS and CSS file
    manifests = Object.fromEntries(
      Object.entries(metafiles).map(([key, metafile]) => [
        key,
        Object
          .entries(metafile.outputs)
          .reduce((acc, [outputFileName, info]) => {
            if (info.entryPoint) {
              acc[info.entryPoint] = {
                jsFile: outputFileName,
                cssFile: info.cssBundle
              };
            }
            return acc;
          }, {})
      ])
    );
    if (isProduction) {
      manifestsCache = manifests;
      metafilesCache = metafiles;
    }
  }

  const { jsFile, cssFile } = manifests.public[filePaths.jsFile] || {};
  const preloadJs = (metafiles.public.outputs[jsFile].imports || [])
    .filter(({ kind }) => kind === 'import-statement')
    .map(({ path: filePath }) => path.resolve(publicURLPath, path.relative(publicDirectoryRelative, filePath)));
  const { jsFile: ssrJSFile } = manifests.ssr[filePaths.jsFile] || {};
  const exports = await import(getRelativePathToSSRDist(ssrJSFile));
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
