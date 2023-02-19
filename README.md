# preact-esbuild-ssr

Example repo to start a multi-page website with Preact and esbuild.

- 🐢 JS, CSS, image files are content hashed ("fingerprinted") on prod for long lived caching
- 💽 Express JS server
- 🔄 Live reload
- ✂️ Shared code chunks / Code splitting (read esbuild docs for caveats)
- 🚀 Preload shared chunks
- 🏝️ Create your own [islands](https://jasonformat.com/islands-architecture/)
- 🌊 Static HTML parts doesn't even have to be generated via preact. But you could if you wish.

```sh
# Dev
npm run dev

# Prod
npm run build
npm run start
```

Example server uses a config file for mapping URL pattern to server handling function. Config file is at `server/routes/routes.js`. This gives full flexibility on how routes and URLs are handled.

Entry files to a page should placed in `client/pages/{name}/{name}.page.jsx`.


You will have to do at least a couple of things to production-ize this template:
1. You may not want to have a single preact context for the entire website. Each page having a separate context might be better.
2. Add [HTTP/2](https://www.npmjs.com/package/http2-express-bridge) support.
3. Upload files from `dist/public` directory to a file storage origin (like AWS S3) and use a CDN to intercept everything under URL path `/public/*` (on the same domain as the express server) to point to the file storage origin. Enable dynamic compression on the CDN.