import { renderPage } from '../../render-page.js';

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export default async (request, reply) => {
  const { pathname: urlPathname } = new URL(request.url, 'http://localhost');

  const html = await renderPage({
    pageName: 'about',
    pageContext: { urlPathname },
    urlPathname
  });

  return reply.status(200).header('Content-Type', 'text/html').send(html);
};
