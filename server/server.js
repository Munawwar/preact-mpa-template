import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import middie from '@fastify/middie';
import routes from './routes/routes.js';
import {
  publicURLPath,
  clientBuildDirectory,
  serverDefaultPort
} from './paths.js';

const port = process.env.PORT || serverDefaultPort;
const isProduction = process.env.NODE_ENV === 'production';

process.title = 'preact-mpa-template';

const app = fastify();

// Initialize Vite dev server in development mode
let viteDevServer = null;
if (!isProduction) {
  const { createDevServer } = await import('./vite-dev-server.js');
  viteDevServer = await createDevServer();

  // Register middie to use Connect/Express middleware with Fastify
  await app.register(middie);

  // Use Vite's middleware for dev assets
  app.use(viteDevServer.middlewares);
}

// Serve static files (production build or public assets)
await app.register(fastifyCompress);
if (isProduction) {
  await app.register(fastifyStatic, {
    root: clientBuildDirectory,
    prefix: publicURLPath,
    immutable: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });
}

// Declare routes
await Promise.all(routes.map(async ({
  method = 'get',
  pattern,
  middlewares = [],
  handler
}) => {
  app.route({
    method: method.toUpperCase(),
    url: pattern,
    preHandler: middlewares,
    handler: async (request, reply) => {
      let routeHandler;
      try {
        // Lazy-load the routes so that node.js doesn't incur a heavy start-up
        // cost both on production and dev (speeds up nodemon reload).
        if (!routeHandler) {
          // Hot module reloading if available (on dev, with dynohot)
          import.meta.hot?.accept(`./routes/${handler}`);
          routeHandler = (await import(`./routes/${handler}`)).default;
        }
      } catch (err) {
        console.error('Could not find handler file:', handler);
        throw err;
      }
      return routeHandler(request, reply);
    }
  });
}));

// Global error handler
app.setErrorHandler((error, request, reply) => {
  console.error(error);
  reply.status(500).send('Unexpected error');
});

try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Server running at http://localhost:${port}`);
  if (!isProduction) {
    console.log(`Vite HMR ready`);
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}
