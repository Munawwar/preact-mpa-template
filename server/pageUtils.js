import renderToString from 'preact-render-to-string';
import { h } from 'preact';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../');

const isProd = process.env.NODE_ENV === 'production';

function getPage (pagePath, where = 'server') {
  if (!isProd) {
    return path.resolve(root, `dist/server/pages/${pagePath}.js`);
  }
  path.resolve(root, `dist/${where}/pages/${pagePath}.js`);
}

async function renderPage (pagePath, where = 'server', initialState) {
  const distPagePath = getPage(pagePath, where);
  console.log('distPagePath', distPagePath);
  const { Page } = await import(distPagePath);
  return renderToString(
    /* @__PURE__ */ h(
      Page,
      { initialState }
    )
  );
}

renderPage('home/home', 'server', { test: 1 });

export { getPage, renderPage };
