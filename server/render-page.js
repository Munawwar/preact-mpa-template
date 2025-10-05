import { renderToString } from "preact-render-to-string";
import { stringify } from "html-safe-json";
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { root, publicURLPath } from './paths.js';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Render a page with SSR and inject dynamic content
 * @param {Object} options - Rendering options
 * @param {string} options.pageName - Name of the page (e.g., 'home', 'about')
 * @param {Object} options.pageContext - Data to pass to the page component
 * @param {string} options.urlPathname - URL pathname for the request
 * @param {string} [options.additionalHeadTags=''] - Additional HTML to inject in head
 * @returns {Promise<string>} Final HTML string
 */
export async function renderPage({
  pageName,
  pageContext,
  urlPathname,
  additionalHeadTags = ''
}) {
  try {
    // Load and render page component
    let pageModule;
    let pageHtml;

    if (isProduction) {
      // Production: Import SSR build
      const ssrModulePath = path.join(root, `dist/server/pages/${pageName}/${pageName}.page.js`);
      pageModule = await import(ssrModulePath);
      pageHtml = pageModule.pageToHtml(pageContext, renderToString);
    } else {
      // Development: Use Vite SSR (dynamic import for dev-only dependency)
      const { getDevServer } = await import('./vite-dev-server.js');
      const viteDevServer = getDevServer();
      pageModule = await viteDevServer.ssrLoadModule(
        `/client/pages/${pageName}/${pageName}.page.jsx`
      );
      pageHtml = pageModule.pageToHtml(pageContext, renderToString);
    }

    // Load HTML template
    let html;
    if (isProduction) {
      html = await fs.readFile(
        path.join(root, `dist/client/client/pages/${pageName}/${pageName}.html`),
        'utf-8'
      );
    } else {
      // Development: Use Vite to transform HTML (dynamic import for dev-only dependency)
      const { getDevServer } = await import('./vite-dev-server.js');
      const viteDevServer = getDevServer();
      const htmlPath = path.join(root, `client/pages/${pageName}/${pageName}.html`);
      html = await fs.readFile(htmlPath, 'utf-8');
      html = await viteDevServer.transformIndexHtml(urlPathname, html);
    }

    // Build dynamic head content
    const dynamicHead = `
    <script>window.pageContext=${stringify(pageContext)};</script>
    <script
      src="${publicURLPath}/instant.page-5.2.0.js"
      type="module"
      fetchpriority="low"
    ></script>
    ${additionalHeadTags}`.trim();

    // Inject SSR content and dynamic head
    const finalHtml = html
      .replace('<!--app-head-->', dynamicHead)
      .replace('<!--app-html-->', pageHtml);

    return finalHtml;
  } catch (error) {
    console.error(`Error rendering ${pageName} page:`, error);
    throw error;
  }
}
