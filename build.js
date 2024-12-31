import { context } from 'esbuild';
import glob from 'tiny-glob';
import chokidar from 'chokidar';
import { parseArgs } from 'node:util';
import pathModule from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import fs, { promises as fsPromises } from 'node:fs';
import rimraf from 'rimraf';
import {
  root,
  publicDirectoryRelative,
  ssrDirectoryRelative,
  publicURLPath,
  publicDirectory,
  ssrDirectory
} from './server/paths.js';

const {
  values: {
    dev: isDevMode,
    watch,
    livereload
  }
} = parseArgs({
  options: {
    dev: {
      type: 'boolean',
      default: false
    },
    watch: {
      type: 'boolean',
      default: false
    },
    livereload: {
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
const publicBuildConfig = {
  outdir: publicDirectoryRelative,
  splitting: true,
  minify: true,
  sourcemap: true,
  ...commonConfig
};
const serverBuildConfig = {
  outdir: ssrDirectoryRelative,
  splitting: false,
  minify: false,
  sourcemap: 'inline',
  sourcesContent: isDevMode,
  external: ['preact', 'preact-render-to-string'],
  ...commonConfig
};

const [ctx1, ctx2] = await Promise.all([
  context(publicBuildConfig),
  context(serverBuildConfig)
]);

const [publicBuildResult, ssrBuildResult] = await Promise.all([
  ctx1.rebuild(),
  ctx2.rebuild()
]);

async function writeMetafile(publicBuildResult, ssrBuildResult) {
  if (publicBuildResult && publicBuildResult.metafile) {
    await Promise.all([
      fsPromises.writeFile(`${publicDirectory}/metafile.json`, JSON.stringify(publicBuildResult.metafile, 0, 2)),
      fsPromises.writeFile(`${ssrDirectory}/metafile.json`, JSON.stringify(ssrBuildResult.metafile, 0, 2))
    ]);
  }
}

await writeMetafile(publicBuildResult, ssrBuildResult);

async function listFiles(dir) {
  const dirents = await fsPromises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = pathModule.resolve(dir, dirent.name);
    return dirent.isDirectory() ? listFiles(res) : res;
  }));
  /** @type {string[]} */
  return files.flat().sort();
}

let currentFiles = await listFiles(publicDirectory);

if (watch) {
  const watchGlob = 'client/';
  // mimicking nodemon logs
  console.debug(`watching path: ${watchGlob}`);
  console.debug(`watching extensions: (all)`);

  let rebuildTimer;
  const rebuildThrottle = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(incrementalRebuild, 50);
  };

  let buffer = [];
  let fireFileChanges = () => {};

  const incrementalRebuild = async () => {
    const startTime = performance.now();
    const [publicBuildResult, ssrBuildResult] = await Promise.all([
      ctx1.rebuild(),
      ctx2.rebuild()
    ]);
    console.debug(`rebuilt in ${(performance.now() - startTime).toFixed(2)} ms`);

    // Give some time for chokidar to figure out overwritten changes
    await new Promise((resolve) => setTimeout(resolve, 50));
    const bufferRef = buffer;
    if (buffer.length) buffer = [];
    await Promise.all([
      writeMetafile(publicBuildResult, ssrBuildResult),
      fireFileChanges(bufferRef)
    ]);
  };

  chokidar
    .watch(watchGlob, {
      ignoreInitial: true
    })
    .on('all', rebuildThrottle);

  if (livereload) {
    const { WebSocketServer } = await import('ws');
    const http = await import('node:http');
    const clientFile = pathModule.join(root, 'client/livereload-client.js');
    const httpServer = http.createServer((req, res) => {
      if (req.url === '/livereload-client.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        fs.createReadStream(clientFile).pipe(res);
      }
    });
    const wss = new WebSocketServer({ server: httpServer });

    const sendBrowserReload = () => {
      console.debug('Send browser reload event');
      wss.clients.forEach(client => {
        client.send(JSON.stringify({ type: 'reload' }));
      });
    };

    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'server-reloaded') {
          sendBrowserReload();
        }
      });
    });

    const metafilePath = `${publicDirectory}metafile.json`;
    const bufferChangedFiles = (path) => {
      if (!path.endsWith('.map') && path !== metafilePath) {
        buffer.push({ event: 'change', path });
      }
    };

    const hashedURLReplaceRegex = /-\w{8}([.\w]+)$/i;
    const publicDirectoryFileURI = pathToFileURL(publicDirectory).href;
    const fileToUrl = (pathAbsolute) => {
      const fileURI = pathToFileURL(pathAbsolute).href;
      const suffix = fileURI.slice(publicDirectoryFileURI.length);
      return `${publicURLPath}/${suffix}`;
    };
    const fileToStableUrl = (pathAbsolute) => {
      const url = fileToUrl(pathAbsolute);
      return {
        stableUrl: url.replace(hashedURLReplaceRegex, '$1'),
        url
      };
    };

    /**
     * @param {{ event: string, path: string }[]} buffer
     * @param {string[]} oldFiles
     * @param {string[]} newFiles
     */
    fireFileChanges = async (buffer) => {
      // filter out .js.map and .css.map files and metafile.json
      const oldFiles = currentFiles.filter((path) => !path.endsWith('.map') && path !== metafilePath);
      currentFiles = await listFiles(publicDirectory);
      const newFiles = currentFiles.filter((path) => !path.endsWith('.map') && path !== metafilePath);
      /** @type {{
       *   stableUrlToHashUrl: { [stableUrl: string]: string },
       *   fileToUrlLookup: { [path: string]: {stableUrl: string, url: string} }
       * }} */
      const {
        stableUrlToHashUrl: oldStableUrlToHashUrl,
        fileToUrlLookup: oldFileToUrlLookup
      } = oldFiles.reduce((acc, pathAbsolute) => {
        const { stableUrl, url } = fileToStableUrl(pathAbsolute);
        acc.stableUrlToHashUrl[stableUrl] = url;
        acc.fileToUrlLookup[pathAbsolute] = { stableUrl, url };
        return acc;
      }, {
        stableUrlToHashUrl: {},
        fileToUrlLookup: {}
      });
      /** @type {{
       *   stableUrlToHashUrl: { [stableUrl: string]: string },
       *   fileToUrlLookup: { [path: string]: {stableUrl: string, url: string} }
       * }} */
      const {
        stableUrlToHashUrl: newStableUrlToHashUrl,
        fileToUrlLookup: newFileToUrlLookup
      } = newFiles.reduce((acc, pathAbsolute) => {
        const { stableUrl, url } = fileToStableUrl(pathAbsolute);
        acc.stableUrlToHashUrl[stableUrl] = url;
        acc.fileToUrlLookup[pathAbsolute] = { stableUrl, url };
        return acc;
      }, {
        stableUrlToHashUrl: {},
        fileToUrlLookup: {}
      });
      const oldFilesSet = new Set(oldFiles);
      const oldStableUrlSet = new Set(Object.keys(oldStableUrlToHashUrl));
      const newFilesSet = new Set(newFiles);
      const newStableUrlSet = new Set(Object.keys(newStableUrlToHashUrl));
      const changes = {
        add: {},
        remove: {},
        replace: {}
      };
      oldFiles.forEach((oldFile) => {
        if (!newFilesSet.has(oldFile)) {
          const { stableUrl: oldStableUrl, url: oldHashUrl } = oldFileToUrlLookup[oldFile];
          // If only hash suffix of file changed, that means it was a "replace" and not a "remove".
          if (newStableUrlSet.has(oldStableUrl)) {
            changes.replace[oldStableUrl] = {
              oldUrl: oldHashUrl,
              newUrl: newStableUrlToHashUrl[oldStableUrl]
            };
          } else {
            changes.remove[oldStableUrl] = oldHashUrl;
          }
        }
      });
      newFiles.forEach((newFile) => {
        if (!oldFilesSet.has(newFile)) {
          const { stableUrl: newStableUrl, url: newUrl } = newFileToUrlLookup[newFile];
          // If only hash suffix of file changed, that means it was a "replace" and not a "remove".
          if (oldStableUrlSet.has(newStableUrl)) {
            changes.replace[newStableUrl] = {
              oldUrl: oldStableUrlToHashUrl[newStableUrl],
              newUrl
            };
          } else {
            changes.add[newStableUrl] = newUrl;
          }
        }
      });
      // the file path here is the public directory's hashed file
      buffer.forEach(({ event, path }) => {
        if (event === 'change') {
          const {stableUrl, url} = fileToStableUrl(path);
          changes.replace[stableUrl] = {
            oldUrl: url,
            newUrl: url
          };
        }
      });

      // Any non-CSS file change should trigger a browser reload
      const remove = Object.values(changes.remove);
      const replace = Object.values(changes.replace);
      const reload = [
        ...remove,
        ...Object.keys(changes.replace)
      ].some((url) => !url.endsWith('.css'));
      if (reload) {
        sendBrowserReload();
        // Adds don't need to be sent to the client, until a JS file change is made (which causes a page reload)
      } else if (remove.length || replace.length) {
        console.debug('Send CSS reload event to browser');
        wss.clients.forEach(client => {
          client.send(JSON.stringify({
            type: 'css',
            operations: {
              remove,
              replace
            }
          }));
        });
      }
    };

    chokidar
      .watch(publicDirectory, {
        ignoreInitial: true
      }).on('change', bufferChangedFiles);

    httpServer.listen(35729, () => {
      console.log('livereload server started on port 35729');
    });
  }
} else {
  ctx1.dispose();
  ctx2.dispose();
}
