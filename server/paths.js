import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, `../`);
const staticDirectory = `${root}/dist/`;

export { __dirname, root, staticDirectory };
