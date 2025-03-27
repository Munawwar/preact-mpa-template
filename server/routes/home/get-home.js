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
    preloadJs,
    css,
    exports: { pageToHtml },
    liveReloadScript
  } = await getPage('home', request.hostname);

  const { pathname: urlPathname } = new URL(request.url, 'http://localhost');
  const pageContext = {
    counter: 10,
    urlPathname,
    // assume text is from a database. This can be fetched in parallel with the `getPage` call.
    banner: /* html */`<p>
      Here's a server component without the complexity.<br>
      You don't need to render this with preact even. Use tagged template literals.
    </p>`
  };
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
        <script
          src="${assetsURLPath}/instant.page-5.2.0.js"
          type="module"
          fetchpriority="low"
        ></script>
      </head>
      <body id="root">
        ${pageHtml}
      </body>
    </html>
  `;

  return reply.status(200).header('Content-Type', 'text/html').send(html);
};
