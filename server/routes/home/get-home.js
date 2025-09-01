import { renderToString } from "preact-render-to-string";
import { stringify } from "html-safe-json";
// You cannot use JSON.stringify directly while interpolating string into a <script>
// tag, because it won't escape stuff like </script> tags and can lead to XSS attacks
import getPage from "../../getPage.js";
import { assetsURLPath } from '../../paths.js';

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export default async (request, reply) => {
  // Find the built code of client/pages/home/home.page.jsx
  const {
    js,
    css,
    exports: { pageToHtml }
  } = await getPage('home');

  const { pathname: urlPathname } = new URL(request.url, 'http://localhost');
  const pageContext = { counter: 10, urlPathname }; // assume data is from a database.
  // So you cannot assume this data is free from XSS attempts
  const pageHtml = pageToHtml(pageContext, renderToString);
  const html = /* html */`
    <!DOCTYPE html>
    <html>
      <head>
        ${css.map((css) => /* html */`<link rel="stylesheet" href="${css}">`).join('\n')}
        <script>window.pageContext=${stringify(pageContext)};</script>
        ${js.map((js) => /* html */`<script type="module" src="${js}"></script>`).join('\n')}
        <script type="module" src="${assetsURLPath}/instant.page-5.2.0.js" fetchpriority="low"></script>
      </head>
      <body id="root">
        ${pageHtml}
      </body>
    </html>
  `;

  return reply.status(200).header('Content-Type', 'text/html').send(html);
};
