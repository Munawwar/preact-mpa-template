import asyncHandler from 'express-async-handler';

export default await Promise.all([{
  method: 'GET',
  pattern: '/',
  handler: './home/home.js'
}].map(async (route) => {
  const handlerFilePath = route.handler;
  try {
    // On development, try to resolve file path immediately to find any immediate issues
    const preloadedHandler = process.env.NODE_ENV === 'production'
      ? null
      : ((await import(handlerFilePath)).default);
    route.handler = asyncHandler(async (...args) => {
      let handler = preloadedHandler;
      // On production, lazy-load the routes so that node.js doesn't incur a heavy start-up cost
      if (!handler) {
        handler = (await import(handlerFilePath)).default;
      }
      return handler(...args);
    });
    return route;
  } catch (err) {
    console.error('Could not find handler file:', handlerFilePath);
    throw err;
  }
}));
