# preact-mpa-template

Example repo to start a multi-page app/website (MPA) with Preact, Fastify and Vite. If you don't need server side rendering (SSR) check [preact-spa-template](https://github.com/Munawwar/preact-spa-template).

- <span aria-hidden>🐢</span> JS, CSS, image files are content hashed ("fingerprinted") on prod for long lived caching
- <span aria-hidden>🤵‍♂️</span> Fastify server (More performant than Express, can add HTTP/2 support)
- <span aria-hidden>🔥</span> HMR both on node.js code and browser code¹
- <span aria-hidden>✂️</span> Shared code chunks / Code splitting
- <span aria-hidden>🚀</span> Automatic chunk preloading
- <span aria-hidden>🗲</span> Preloads pages on mouse hover / touch start (using [instant.page](https://instant.page/)²)
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

¹ Hot Module Replacement (HMR) here means:
- Client-side changes (JS/JSX/CSS) are handled by Vite's HMR:
  - CSS changes are reflected instantly without page reload
  - Component changes trigger a fast page reload
- Server-side changes are handled by nodemon + dynohot:
  - Route handler changes hot reload without full server restart
  - Server config changes restart the server
- Route handlers are lazy loaded to:
  1. Keep dev server restarts fast
  2. Keep cold start time low for serverless deployments (e.g., GCP Cloud Run)

² the hosted version of instant.page doesn't have prerender option, so I had to minify myself

## Structure

### Multi-Page Setup
Each page consists of:
- `client/pages/{name}/{name}.html` - HTML entry file with static markup
- `client/pages/{name}/{name}.page.jsx` - Preact component with hydration and SSR export

### Routing
Server uses a config file for mapping URL patterns to handlers at `server/routes/routes.js`. Each route handler:
- Loads the appropriate page component for SSR
- Transforms HTML template (dev) or reads built HTML (prod)
- Injects dynamic data (pageContext, etc.)
- Returns complete HTML with SSR content


## Production Deployment

### Building for Production
```sh
npm run build
```

This creates:
- `dist/client/` - Client-side assets (HTML, JS, CSS, images) with hashed filenames
- `dist/server/` - SSR-ready page modules

### Deploying Static Assets to S3/CDN

#### Option 1: Direct Fastify Serving
The server serves files from `dist/client/` directly. No additional configuration needed. You may add CDN on front of your server and cache any file being served from `/assets/*`.

#### Option 2: CDN with S3 Origin
1. Upload entire `dist/client/` directory to S3
2. Configure CloudFront/CDN to point to S3 bucket
3. Set cache headers:
   - `/assets/*` (JS/CSS with hashes): `Cache-Control: public, max-age=31536000, immutable`
   - `/*.html`: `Cache-Control: no-cache` or short TTL
   - `/instant.page-5.2.0.js`: `Cache-Control: public, max-age=31536000`
4. Update server to use CDN URL for static assets (optional)

### Production Optimizations to Consider
1. Each page already has a separate Preact context
2. Add [HTTP/2](https://fastify.dev/docs/latest/Reference/HTTP2/) support for better performance
3. If using CDN, disable Fastify compression (use CDN compression instead)
4. Consider CSS modules or utility CSS via Vite plugins

## Credits

Thanks to [vite-plugin-ssr](https://vite-plugin-ssr.com/) for inspiration on SSR patterns with Vite.
