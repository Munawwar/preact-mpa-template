# preact-mpa-template

Example repo to start a multi-page app/website (MPA) with Preact, fastify and esbuild. If you don't need server side rendering (SSR) check [preact-spa-template](https://github.com/Munawwar/preact-spa-template).

- <span aria-hidden>🐢</span> JS, CSS, image files are content hashed ("fingerprinted") on prod for long lived caching
- <span aria-hidden>🤵‍♂️</span> Fastify server (More performant than Express, can add HTTP/2 support)
- <span aria-hidden>🔄</span> Live reload¹
- <span aria-hidden>✂️</span> Shared code chunks / Code splitting (read esbuild docs for caveats)
- <span aria-hidden>🚀</span> Preload shared chunks
- <span aria-hidden>🗲</span> Preloads pages on mouse hover / touch start (using [instant.page](https://instant.page/))
- <span aria-hidden>🌐</span> Static files deployable to S3 behind a CDN

```sh
# Dev
npm run dev

# Prod
npm run build
node server/server.js
# Don't use `npm run prod-debug` here as npm is known to swallow process signals
# Also --enable-source-maps is heavy, so use it cautiously
```

VSCode note: Install [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) extension to syntax highlight HTML inside of JS template literals.

¹ Live Reload here means:
- Changes to client JS are automatically refreshed via a full page reload
- Changes to CSS are reflected on page without page reload
- Changes to node.js server routes are hot reloaded
- Route handlers are also lazy loaded, to not only get the hot reloading to work, but also:
  1. to keep dev server restarts fast (restart are needed when editing common server code outside routes)
  2. to keep cold start time low, if you plan to deploy this to serverless environments like GCP Cloud Run

## Structure

Example server uses a config file for mapping URL pattern to server handling function. Config file is at `server/routes/routes.js`. This gives full flexibility on how routes and URLs are handled.

Entry files to a page should placed in `client/pages/{name}/{name}.page.jsx`.


You will have to do at least a couple of things to production-ize this template:
1. You may not want to have a single preact context for the entire website. Each page having a separate context might be better.
2. Add [HTTP/2](https://fastify.dev/docs/latest/Reference/HTTP2/) support.
3. Use a CDN for URL paths `/public/*` and `/assets/*` (on the same domain as the fastify server). Remove fastify compression and enable dynamic compression on the CDN. Optionally upload files from `dist/public` and `assets` directories to a file storage origin (like AWS S3) so that your main server doesn't have to serve static files (especially if your server is not auto-scaling or is constrained by bandwidth).
4. You might want a CSS solution like CSS modules or utility CSS (look into esbuild plugins for these)

## Credits

Thanks to [vite-plugin-ssr](https://vite-plugin-ssr.com/) for some inspiration and example snippets, but I didn't use Vite here.
