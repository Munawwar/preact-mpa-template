import { WebSocketServer } from 'ws';
import http from 'http';
import chokidar from 'chokidar';
import {
  root,
  publicDirectory,
  publicURLPath
} from './paths.js';
import pathModule from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const httpServer = http.createServer((req, res) => {
  if (req.url === '/livereload-client.js') {
    const clientPath = pathModule.join(root, 'client/livereload-client.js');
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    fs.createReadStream(clientPath).pipe(res);
  }
});

const wss = new WebSocketServer({ server: httpServer });

const ignorePublicFileRegex = /\.(js|css)\.map$/i;
const hashedURLReplaceRegex = /-\w+.css$/i;

const publicMetafile = pathModule.resolve(publicDirectory, 'metafile.json');
const publicDirectoryFileURI = pathToFileURL(publicDirectory).href;

const watcher = chokidar.watch(
  [
    publicDirectory,
    `${root}/server/`
  ],
  {
    ignored: (path) => (
      path === publicMetafile ||
      (path.startsWith(publicDirectory) && ignorePublicFileRegex.test(path))
    ),
    awaitWriteFinish: {
      stabilityThreshold: 30,
      pollInterval: 60
    }
  });

function sendPageReload() {
  wss.clients.forEach(client => {
    client.send(JSON.stringify({ type: 'reload' }));
  });
}

/** @type {{ eventType: 'add' | 'unlink' | 'change', pathAbsolute: string }[]} */
let buffer = [];
function sendMessage() {
  if (buffer.length === 0) return;
  const operations = buffer.reduce((acc, { eventType, pathAbsolute }) => {
    if (!acc.reload && pathAbsolute.endsWith('.css')) {
      const fileURI = pathToFileURL(pathAbsolute).href;
      const suffix = fileURI.slice(publicDirectoryFileURI.length);
      const url = `${publicURLPath}/${suffix}`;
      const stableURL = url.replace(hashedURLReplaceRegex, '.css');
      if (eventType === 'add') {
        acc.css.add[stableURL] = url;
      } else if (eventType === 'unlink') {
        acc.css.remove[stableURL] = url;
      } else if (eventType === 'change') {
        acc.css.replace[stableURL] = {
          oldUrl: url,
          newUrl: url
        };
      }
    } else {
      acc.reload = true;
    }
    return acc;
  }, {
    css: {
      add: {},
      remove: {},
      replace: {}
    },
    reload: false
  });
  buffer = [];
  if (operations.reload) {
    sendPageReload();
  } else {
    // Detect more change operations
    Object.keys(operations.css.add).forEach((stableUrl) => {
      if (operations.css.remove[stableUrl]) {
        operations.css.replace[stableUrl] = {
          oldUrl: operations.css.remove[stableUrl],
          newUrl: operations.css.add[stableUrl]
        };
        delete operations.css.remove[stableUrl];
        delete operations.css.add[stableUrl];
      }
    });
    const remove = Object.values(operations.css.remove);
    const replace = Object.values(operations.css.replace);
    // Addition of new CSS files don't immediately affect a page until
    // it is imported from JS. So only consider replace and removes.
    if (remove.length || replace.length) {
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
  }
}

let timer;
function sendMessageThrottle(eventType, pathAbsolute) {
  buffer.push({ eventType, pathAbsolute });
  clearTimeout(timer);
  timer = setTimeout(sendMessage, 50);
}

watcher.on('all', sendMessageThrottle);

httpServer.listen(35729, () => {
  console.log('livereload server started on port 35729');
});
