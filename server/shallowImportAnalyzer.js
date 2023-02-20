import fs from 'node:fs';

const cache = {};
const importStatementRegex = /(?:^|;)import[^\w].+?[^\w]from"([^"]+)/g;
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
    const imports = [];
    let matches;
    importStatementRegex.lastIndex = 0;
    while ((matches = importStatementRegex.exec(source))) {
      imports.push(matches[1]);
    }
    cache[distPageFilePath] = imports;
  }
  return cache[distPageFilePath];
}

// Test
// console.log(
//   await shallowImportAnalyzer(
//     'dist/public/pages/about/about.page-ZQOZTJGQ.js'
//   ),
//   await shallowImportAnalyzer(
//     'dist/public/pages/home/home.page-FHON3K7Y.js'
//   )
// );

export default shallowImportAnalyzer;
