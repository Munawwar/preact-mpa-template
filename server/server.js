import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import routes from './routes/routes.js';
import {
  publicURLPath,
  publicDirectory,
  assetsURLPath,
  assetsDirectory,
  serverDefaultPort,
  livereloadServerPort
} from './paths.js';
const port = process.env.PORT || serverDefaultPort;

process.title = 'preact-mpa-template';

const app = fastify();

await app.register(fastifyCompress);
await app.register(fastifyStatic, {
  root: publicDirectory,
  prefix: publicURLPath,
  immutable: true,
  maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
});
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
  await app.listen({ port, host: '0.0.0.0' }, async () => {
    // Hot module reloading if available (on dev, with dynohot)
    if (import.meta.hot) {
      const { WebSocket } = await import('ws');
      const maxRetries = 100;
      const retryDelay = 1000;

      let browserReloadServerWs = null;

      import.meta.hot.on("message", () => {
        browserReloadServerWs?.send(JSON.stringify({ type: 'server-reloaded' }));
      });

      (async function connectWebSocket(retryCount = 0) {
        let ws;
        try {
          ws = new WebSocket(`ws://localhost:${livereloadServerPort}`);

          ws.on('open', () => {
            browserReloadServerWs = ws;
            retryCount = 0;
            browserReloadServerWs.send(JSON.stringify({ type: 'server-reloaded' }));
          });

          let errorMessage = null;
          ws.on('close', async () => {
            browserReloadServerWs = null;
            if (retryCount < maxRetries) {
              console.warn(`Browser reload server disconnected${errorMessage ? ` (${errorMessage})` : ''}. Retrying (${retryCount + 1}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              connectWebSocket(retryCount + 1);
            } else {
              console.warn(`'Browser reload server disconnected${errorMessage ? ` (${errorMessage})` : ''}. Retries exhausted.`);
            }
            errorMessage = null;
          });

          ws.on('error', (error) => {
            browserReloadServerWs = null;
            errorMessage = error.message;
            ws.close();
          });
        } catch (error) {
          ws.close();
          browserReloadServerWs = null;
        }
      })();
    }
  });
  console.log(`Server running at http://localhost:${port}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
