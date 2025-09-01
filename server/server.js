import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import fastifyMiddie from '@fastify/middie';
import routes from './routes/routes.js';

import {
  publicURLPath,
  publicDirectory,
  assetsURLPath,
  assetsDirectory,
  serverDefaultPort
} from './paths.js';

const isDev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || serverDefaultPort;

const app = fastify();

await app.register(fastifyCompress);

// Set up rsbuild dev middleware in development mode
let rsbuildServer = null;
if (isDev) {
  const { createRsbuild } = await import('@rsbuild/core');

  // Import the rsbuild config
  const { default: rsbuildConfig } = await import('../rsbuild.config.js');

  // Create rsbuild instance in middleware mode
  const rsbuild = await createRsbuild({ rsbuildConfig });

  rsbuildServer = await rsbuild.createDevServer();

  // Register middleware support for Fastify
  await app.register(fastifyMiddie);

  // Apply rsbuild middleware
  app.use(rsbuildServer.middlewares);
} else {
  await app.register(fastifyStatic, {
    root: publicDirectory,
    prefix: publicURLPath,
    immutable: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });
}
await app.register(fastifyStatic, {
  root: assetsDirectory,
  prefix: assetsURLPath,
  immutable: true,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  decorateReply: false // the reply decorator has been added by the first plugin registration
});

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
  await app.listen({ port });
  console.log(`Server running at http://localhost:${port}`);

  // Complete rsbuild integration following official docs
  if (isDev && rsbuildServer) {
    // Notify Rsbuild that the custom server has started
    await rsbuildServer.afterListen();

    // Activate WebSocket connection for HMR
    rsbuildServer.connectWebSocket({ server: app.server });

    console.log('🔥 HMR enabled via rsbuild middleware');
  }

  // Keep dynohot for server-side hot reloading
} catch (err) {
  console.error(err);
  process.exit(1);
}
