import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  __dirname,
  root,
  publicDirectory,
  ssrDirectory
} from './paths.js';

const isProduction = process.env.NODE_ENV === 'production';

function getRelativePathToSSRDist(distSSRPath) {
  return path.relative(__dirname, path.resolve(root, distSSRPath));
}

let manifestsCache;
/**
 * Use this function on the server-side to get the client-side page code and dependencies
 * (exported functions, JS, shared JS, CSS URLs etc from the build of client/pages/<pageName>/<pageName>.page.jsx).
 *
 * `exports` property has the JS functions that were exported from the page component, loaded
 * (imported) and ready, which can then be called to render the page to HTML.
 *
 * `css`, `js`, `preloadJs`, `preloadCss` are URLs that can be added to HTML head.
 * `js` is the URL to page component file. `preloadJs` are shared JS files that are dependencies to the page JS.
 * @param {string} pageName Name of the page. You can find the name part from client/pages/<pageName>/<pageName>.page.jsx
 * @returns {Promise<{
 *   js: string,
 *   css: string[],
 *   exports: Record<string, Function>
 * }>}
 */
async function getPage(pageName) {
  // Read manifests from disk (both dev and production)
  // In dev mode, don't cache to get fresh builds
  let manifests = manifestsCache;
  if (!manifests || !isProduction) {
    const [publicManifestString, ssrManifestString] = await Promise.all([
      fs.readFile(
        path.resolve(publicDirectory, 'manifest.json'),
        'utf-8'
      ).catch(() => '{"entries":{}}'), // Fallback for missing manifest
      fs.readFile(
        path.resolve(ssrDirectory, 'manifest.json'),
        'utf-8'
      ).catch(() => '{"entries":{}}') // Fallback for missing manifest
    ]);
    const rawManifests = {
      public: JSON.parse(publicManifestString),
      ssr: JSON.parse(ssrManifestString)
    };
    // Convert rsbuild manifest format to our expected format
    manifests = Object.fromEntries(
      Object.entries(rawManifests).map(([key, manifest]) => [
        key,
        Object
          .entries(manifest.entries || {})
          .reduce((acc, [entryKey, entryInfo]) => {
            acc[entryKey] = {
              jsFiles: (entryInfo.initial?.js || []).map(js => (
                key === 'public' ? js : js.replace(/^\//, '')
              )),
              cssFiles: entryInfo.initial?.css || []
            };
            return acc;
          }, {})
      ])
    );
    if (isProduction) {
      manifestsCache = manifests;
    }
  }

  // Look for entries using the correct key format from manifest
  const entryKey = `client/pages/${pageName}/${pageName}.page`;
  const publicManifest = manifests.public[entryKey] || {};
  const ssrManifest = manifests.ssr[entryKey] || {};

  const { jsFiles, cssFiles } = publicManifest;
  const { jsFiles: ssrJSFiles } = ssrManifest;

  const ssrFilePath = path.resolve(ssrDirectory, ssrJSFiles[0]);
  const exports = await import(getRelativePathToSSRDist(ssrFilePath));

  return {
    js: jsFiles || [],
    css: cssFiles || [],
    exports
  };
}

export default getPage;
