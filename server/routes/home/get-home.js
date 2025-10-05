import { renderToString } from "preact-render-to-string";
import { stringify } from "html-safe-json";
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { root } from '../../paths.js';
import { getDevServer } from '../../vite-dev-server.js';

const isProduction = process.env.NODE_ENV === 'production';
const pageName = 'home';

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export default async (request, reply) => {
  const { pathname: urlPathname } = new URL(request.url, 'http://localhost');
  const pageContext = { counter: 10, urlPathname };

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
      // Development: Use Vite SSR
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
      const viteDevServer = getDevServer();
      const htmlPath = path.join(root, `client/pages/${pageName}/${pageName}.html`);
      html = await fs.readFile(htmlPath, 'utf-8');
      html = await viteDevServer.transformIndexHtml(urlPathname, html);
    }

    // Inject dynamic head content
    const dynamicHead = `
    <script>window.pageContext=${stringify(pageContext)};</script>
    <script
      src="/instant.page-5.2.0.js"
      type="module"
      fetchpriority="low"
    ></script>`;

    // Inject SSR content and dynamic head
    const finalHtml = html
      .replace('<!--app-head-->', dynamicHead)
      .replace('<!--app-html-->', pageHtml);

    return reply.status(200).header('Content-Type', 'text/html').send(finalHtml);
  } catch (error) {
    console.error('Error rendering home page:', error);
    throw error;
  }
};
