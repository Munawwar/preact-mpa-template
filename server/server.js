import express from 'express';
import sirvMiddleware from 'sirv';
import asyncHandler from 'express-async-handler';
import routes from './routes/routes.js';
import { publicURLPath, publicDirectory } from './paths.js';
import compression from 'compression';
const port = process.env.PORT || 5132;

const isProduction = process.env.NODE_ENV === 'production';

const app = express();

app.use(compression());
app.use(
  publicURLPath,
  sirvMiddleware(publicDirectory, {
    dev: !isProduction
  })
);

// Declare routes
await Promise.all(routes.map(async ({
  method = 'get',
  pattern,
  middlewares = [],
  handler
}) => {
  app[method.toLowerCase()](
    pattern,
    ...middlewares,
    asyncHandler(async (req, res, next) => {
      let routeHandler;
      try {
        // Lazy-load the routes so that node.js doesn't incur a heavy start-up
        // cost both on production and dev (speeds up nodemon reload).
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

// All errors gets propagated to the magic 4 argument default
// handler (https://expressjs.com/en/guide/error-handling.html#the-default-error-handler).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Unexpected error');
});

app.listen(port);
console.log(`Server running at http://localhost:${port}`);

if (!isProduction) {
  const livereload = await import('livereload');
  const lrserver = livereload.createServer({
    delay: 50
  });
  lrserver.watch(publicDirectory);
}
