import { renderToString } from "preact-render-to-string";
import getPage from "../../getPage.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export default async (req, res) => {
  const {
    js,
    preloadJs,
    css,
    exports: { pageToHtml },
    liveReloadScript
  } = await getPage('home', req.hostname);

  const pageContext = { counter: 10 };
  const pageHtml = pageToHtml(pageContext, renderToString);
  const html = /* html */`
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="${css}">
        ${preloadJs.map((js) => /* html */`<link rel="modulepreload" href="${js}">`).join('\n')}
        <script>window.pageContext=${JSON.stringify(pageContext)};</script>
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
