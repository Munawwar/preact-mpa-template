import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, `../`);
const distDirectory = `${root}/dist`;
const publicDirectoryRelative = 'dist/public/';
const publicDirectory = `${root}/${publicDirectoryRelative}`;
const ssrDirectoryRelative = 'dist/ssr/';
const ssrDirectory = `${root}/${ssrDirectoryRelative}`;
const publicURLPath = '/public';
const serverDefaultPort = 5132;
const livereloadServerPort = 35729;

export {
  __dirname,
  root,
  distDirectory,
  publicURLPath,
  publicDirectory,
  publicDirectoryRelative,
  ssrDirectory,
  ssrDirectoryRelative,
  serverDefaultPort,
  livereloadServerPort
};
