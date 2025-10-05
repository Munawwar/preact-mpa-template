import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, `../`);

// Public folder for static assets (copied to dist/client by Vite)
const publicDirectoryRelative = 'public/';
const publicDirectory = `${root}/${publicDirectoryRelative}`;

// Vite build output directories
const clientBuildDirectory = `${root}/dist/client`;
const clientBuildDirectoryRelative = 'dist/client';
const ssrBuildDirectory = `${root}/dist/server`;
const ssrBuildDirectoryRelative = 'dist/server';

// Public URL path for serving static assets
const publicURLPath = '/';

// Server configuration
const serverDefaultPort = 5132;
const viteHmrPort = 24678;

export {
  __dirname,
  root,
  publicDirectory,
  publicDirectoryRelative,
  clientBuildDirectory,
  clientBuildDirectoryRelative,
  ssrBuildDirectory,
  ssrBuildDirectoryRelative,
  publicURLPath,
  serverDefaultPort,
  viteHmrPort
};
