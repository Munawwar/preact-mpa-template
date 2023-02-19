import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, `../`);
const staticDirectoryRelative = 'dist/public/';
const staticDirectory = `${root}/${staticDirectoryRelative}`;
const ssrDirectoryRelative = 'dist/ssr/';
const ssrDirectory = `${root}/${ssrDirectoryRelative}`;
const publicURLPath = '/static';

export {
  __dirname,
  root,
  publicURLPath,
  staticDirectory,
  staticDirectoryRelative,
  ssrDirectory,
  ssrDirectoryRelative
};
