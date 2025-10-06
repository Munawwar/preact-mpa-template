import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, `../`);

const publicURLPath = '/public';
const publicDirectoryRelative = 'public';
const publicDirectory = path.join(root, publicDirectoryRelative);

const publicBuildURLPath = '/public/dist';
const publicBuildDirectoryRelative = path.join(publicDirectoryRelative, 'dist');
const publicBuildDirectory = path.join(root, publicDirectoryRelative, 'dist');

const ssrDirectoryRelative = 'dist-ssr';
const ssrDirectory = path.join(root, ssrDirectoryRelative);

const serverDefaultPort = 5132;
const livereloadServerPort = 35729;

export {
  root,
  publicURLPath,
  publicBuildURLPath,
  publicDirectory,
  // publicDirectoryRelative,
  publicBuildDirectory,
  publicBuildDirectoryRelative,
  ssrDirectory,
  ssrDirectoryRelative,
  serverDefaultPort,
  livereloadServerPort
};
