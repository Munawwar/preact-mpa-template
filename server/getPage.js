import path from 'node:path';
import fs from 'node:fs';
import {
  __dirname,
  root,
  staticDirectory
} from './paths.js';
import shallowImportAnalyzer from './shallowImportAnalyzer.js';

const isProduction = process.env.NODE_ENV === 'production';

function getRelativePathToDist(distPath) {
  return path.relative(__dirname, path.resolve(root, distPath));
}

function mapSrcToDevDist(srcPath) {
  return srcPath
    .replace(/^client\//, 'dist/')
    .replace(/\.jsx$/, '.js');
}

let manifest;
async function getPage(pageName, hostname) {
  let jsFile = `client/pages/${pageName}/${pageName}.page.jsx`;
  let cssFile = `client/pages/${pageName}/${pageName}.page.css`;
  let preactRenderToStringFile = 'client/renderToString.jsx';
  let liveReloadScript;
  if (isProduction) {
    // Map from server manifest
    // Cache manifest if not cached
    if (!manifest) {
      manifest = JSON.parse(
        await fs.promises.readFile(
          path.resolve(root, `dist/manifest.json`),
          'utf-8'
        )
      );
    }
    jsFile = manifest[jsFile];
    cssFile = manifest[cssFile];
    preactRenderToStringFile = manifest[preactRenderToStringFile];
  } else {
    jsFile = mapSrcToDevDist(jsFile);
    cssFile = mapSrcToDevDist(cssFile);
    preactRenderToStringFile = mapSrcToDevDist(preactRenderToStringFile);
    liveReloadScript = `http://${hostname.split(':')[0]}:35729/livereload.js?snipver=1`;
  }

  const [
    exports,
    preloadJs,
    preactRenderToStringExports
  ] = await Promise.all([
    import(getRelativePathToDist(jsFile)),
    shallowImportAnalyzer(jsFile),
    import(getRelativePathToDist( preactRenderToStringFile))
  ]);
  return {
    js: `/${path.relative(staticDirectory, jsFile)}`,
    preloadJs,
    css: `/${path.relative(staticDirectory, cssFile)}`,
    exports,
    preactRenderToStringExports,
    liveReloadScript
  };
}

export default getPage;
