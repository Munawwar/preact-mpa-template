import fs from 'node:fs';
import { publicURLPath } from './paths.js';

const cache = {};
/**
 * Shallow analyzes ESM import statements of a page file
 * @param {string} distPageFilePath A page JS file in the dist/ folder.
 */
async function shallowImportAnalyzer(distPageFilePath) {
  if (!cache[distPageFilePath]) {
    const handle = await fs.promises.open(distPageFilePath);
    const buffer = Buffer.alloc(5000);
    await handle.read(buffer, 0, 5000, 0);
    await handle.close();
    const source = buffer.toString();
    const regex = /(?:^|;)import[^\w].+?[^\w]from"([^"]+)/g;
    const imports = [];
    let matches;
    while ((matches = regex.exec(source))) {
      imports.push(`${publicURLPath}/${matches[1].split('/').pop()}`);
    }
    cache[distPageFilePath] = imports;
  }
  return cache[distPageFilePath];
}

// Test
// shallowImportAnalyzer(
//   'dist/pages/about/about.page.js'
// )

export default shallowImportAnalyzer;
