# preact-mpa-starter-template

Example repo to start a multi-page app/website (MPA) with Preact, express and esbuild. If you don't need server side rendering (SSR) check [preact-spa-start-template](https://github.com/Munawwar/preact-spa-starter-template).

- <span aria-hidden>🐢</span> JS, CSS, image files are content hashed ("fingerprinted") on prod for long lived caching
- <span aria-hidden>💽</span> Express JS server
- <span aria-hidden>🔄</span> Live reload
- <span aria-hidden>✂️</span> Shared code chunks / Code splitting (read esbuild docs for caveats)
- <span aria-hidden>🚀</span> Preload shared chunks
- <span aria-hidden>🏝️</span> Create your own [islands](https://jasonformat.com/islands-architecture/)
- <span aria-hidden>🌊</span> Static HTML parts doesn't even have to be generated via preact. But you could if you wish.

```sh
# Dev
npm run dev

# Prod
npm run build
npm run start
```

VSCode note: Install [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) extension to syntax highlight HTML inside of JS template literals.

## Structure

Example server uses a config file for mapping URL pattern to server handling function. Config file is at `server/routes/routes.js`. This gives full flexibility on how routes and URLs are handled.

Entry files to a page should placed in `client/pages/{name}/{name}.page.jsx`.


You will have to do at least a couple of things to production-ize this template:
1. You may not want to have a single preact context for the entire website. Each page having a separate context might be better.
2. Add [HTTP/2](https://www.npmjs.com/package/http2-express-bridge) support.
3. Upload files from `dist/public` directory to a file storage origin (like AWS S3) and use a CDN to intercept everything under URL path `/public/*` (on the same domain as the express server) to point to the file storage origin. Enable dynamic compression on the CDN.
4. You might want a CSS solution like CSS modules or utility CSS (look into esbuild plugins for these)

## Credits

Thanks to [vite-plugin-ssr](https://vite-plugin-ssr.com/) for some inspiration and example snippets, but I didn't use Vite here.