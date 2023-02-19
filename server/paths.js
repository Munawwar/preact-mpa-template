import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, `../`);
const staticDirectory = `${root}/dist/public/`;
const ssrDirectory = `${root}/dist/ssr/`;
const publicURLPath = '/static';

export {
  __dirname,
  root,
  publicURLPath,
  staticDirectory,
  ssrDirectory
};
