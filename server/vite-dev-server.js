import { createServer as createViteServer } from 'vite';

let viteDevServer = null;

/**
 * Create and initialize Vite dev server in middleware mode
 * @returns {Promise<import('vite').ViteDevServer>}
 */
export async function createDevServer() {
  if (!viteDevServer) {
    viteDevServer = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: 24678
        }
      },
      appType: 'custom',
      base: '/public/'
    });
  }
  return viteDevServer;
}

/**
 * Get the existing Vite dev server instance
 * @returns {import('vite').ViteDevServer | null}
 */
export function getDevServer() {
  return viteDevServer;
}
