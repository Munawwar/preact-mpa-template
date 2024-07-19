import { renderToString } from "preact-render-to-string";
import { stringify } from "html-safe-json";
// You cannot use JSON.stringify directly while interpolating string into a <script>
// tag, because it won't escape stuff like </script> tags and can lead to XSS attacks
import getPage from "../../getPage.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async (req, res) => {
  // Find the built code of client/pages/home/home.page.jsx
  const {
    js,
    preloadJs,
    css,
    exports: { pageToHtml },
    liveReloadScript
  } = await getPage('home', req.hostname);

  const pageContext = { counter: 10, urlPathname: req.path }; // assume data is from a database.
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

  res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
};
