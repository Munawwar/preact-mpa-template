import { renderToString } from "preact-render-to-string";
import { stringify } from "html-safe-json";
// You cannot use JSON.stringify directly while interpolating string into a <script>
// tag, because it won't escape stuff like </script> tags and can lead to XSS attacks
import getPage from "../../getPage.js";

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export default async (request, reply) => {
  // Find the built code of client/pages/about/about.page.jsx
  const {
    js,
    preloadJs,
    css,
    exports: { pageToHtml },
    liveReloadScript
  } = await getPage('about', request.hostname);

  const { pathname: urlPathname } = new URL(request.url, 'http://localhost');
  const pageContext = { urlPathname }; // assume data is from a database.
  // So you cannot assume this data is free from XSS attempts
  const pageHtml = pageToHtml(pageContext, renderToString);
  const html = /* html */`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="${css}">
        ${preloadJs.map((js) => /* html */`<link rel="modulepreload" href="${js}">`).join('\n')}
        <script>window.pageContext=${stringify(pageContext)};</script>
        <script type="module" src="${js}"></script>
        ${liveReloadScript ? /* html */`<script src="${liveReloadScript}"></script>` : ''}
      </head>
      <body>
        ${pageHtml}
      </body>
    </html>
  `;

  return reply.status(200).header('Content-Type', 'text/html').send(html);
};
