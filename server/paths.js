import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, `../`);
const publicDirectoryRelative = 'dist/public/';
const publicDirectory = `${root}/${publicDirectoryRelative}`;
const ssrDirectoryRelative = 'dist/ssr/';
const ssrDirectory = `${root}/${ssrDirectoryRelative}`;
const nonIslandMinDirectoryRelative = 'dist/non-island-min/';
const nonIslandMinDirectory = `${root}/${nonIslandMinDirectoryRelative}`;
const publicURLPath = '/public';

export {
  __dirname,
  root,
  publicURLPath,
  publicDirectory,
  publicDirectoryRelative,
  ssrDirectory,
  ssrDirectoryRelative,
  nonIslandMinDirectoryRelative,
  nonIslandMinDirectory
};
