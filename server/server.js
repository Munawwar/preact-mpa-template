import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCompress from '@fastify/compress';
import routes from './routes/routes.js';
import { publicURLPath, publicDirectory } from './paths.js';
const port = process.env.PORT || 5132;

const app = fastify();

await app.register(fastifyCompress);
await app.register(fastifyStatic, {
  root: publicDirectory,
  prefix: publicURLPath
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
} catch (err) {
  console.error(err);
  process.exit(1);
}
