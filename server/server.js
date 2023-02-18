import express from 'express'
import sirvMiddleware from 'sirv'
import asyncHandler from 'express-async-handler';
import routes from './routes/routes.js';
import { staticDirectory } from './paths.js'

const port = process.env.PORT || 5132;

const isProduction = process.env.NODE_ENV === 'production'

const app = express();

// Use sirv on prod as is caches files read
// On dev use express.static as we don't want strong caching
if (isProduction) {
  app.use(sirvMiddleware(staticDirectory))
} else {
  app.use(express.static(staticDirectory))
}

// Declare routes
await Promise.all(routes.map(async ({
  method = 'get',
  pattern,
  middlewares = [],
  handler
}) => {
  // On development, try to resolve file path immediately to find any immediate issues
  const preloadedHandler = isProduction ? null : (await import(`./routes/${handler}`)).default;
  app[method.toLowerCase()](
    pattern,
    ...middlewares,
    asyncHandler(async (req, res, next) => {
      let routeHandler = preloadedHandler;
      try {
        // On production, lazy-load the routes so that node.js doesn't incur a heavy start-up cost
        if (!routeHandler) {
          routeHandler = (await import(`./routes/${handler}`)).default;
        }
      } catch (err) {
        console.error('Could not find handler file:', handler);
        throw err;
      }

      return routeHandler(req, res, next);
    })
  );
}));

app.listen(port);
console.log(`Server running at http://localhost:${port}`);

if (!isProduction) {
  const livereload = await import('livereload');
  const lrserver = livereload.createServer({
    delay: 50
  });
  lrserver.watch(staticDirectory);
}
