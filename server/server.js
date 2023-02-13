import express from 'express';
import routes from './routes/routes.js';

const port = process.env.PORT || 5132;

const app = express();

// Declare routes
routes.forEach(({
  method = 'get',
  pattern,
  middlewares = [],
  handler
}) => {
  app[method.toLowerCase()](
    pattern,
    ...middlewares,
    handler
  );
});

app.listen(port);
console.log(`Server running at http://localhost:${port}`);
