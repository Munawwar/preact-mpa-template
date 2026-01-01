import { renderToString } from "preact-render-to-string";
import { stringify } from "html-safe-json";
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { root, publicURLPath } from './paths.js';

const isProduction = process.env.NODE_ENV === 'production';

// Cache manifest and template in production (loaded once, reused for all requests)
let manifestCache = null;
let templateCache = null;

/**
 * Collect and transform CSS from Vite's module graph in dev mode
 * @param {Object} viteDevServer - Vite dev server instance
 * @param {string} entryUrl - Entry point URL (e.g., '/client/pages/home/home.page.jsx')
 * @returns {Promise<Array<{url: string, content?: string, isModule: boolean}>>}
 */
async function collectDevCSS(viteDevServer, entryUrl) {
  const cssFiles = [];
  const visited = new Set();

  async function traverse(url) {
    if (visited.has(url)) return;
    visited.add(url);

    const mod = await viteDevServer.moduleGraph.getModuleByUrl(url);
    if (!mod) return;

    if (mod.url && mod.url.endsWith('.css')) {
      const isModule = mod.url.includes('.module.');

      if (isModule) {
        // CSS module: transform to get scoped CSS
        try {
          const result = await viteDevServer.transformRequest(mod.url);
          if (result && result.code) {
            // Extract CSS from Vite's wrapped JS code
            // Vite 7 pattern: const __vite__css = "..."
            const cssMatch = result.code.match(/const __vite__css = "([^"]*)"/);
            if (cssMatch) {
              const cssContent = cssMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'");
              cssFiles.push({ url: mod.url, content: cssContent, isModule: true });
            }
          }
        } catch (err) {
          console.warn(`Failed to transform CSS module ${mod.url}:`, err);
        }
      } else {
        // Regular CSS: use link tag
        cssFiles.push({ url: mod.url, isModule: false });
      }
    }

    if (mod.importedModules) {
      for (const imported of mod.importedModules) {
        if (imported.url) {
          await traverse(imported.url);
        }
      }
    }
  }

  await traverse(entryUrl);
  return cssFiles;
}

/**
 * Generate cleanup script that removes temporary CSS elements
 * after Vite's HMR has injected the corresponding style tags
 */
function getDevCSSCleanupScript() {
  return `<script data-temp-css-cleanup>
// Development only: Remove temporary CSS after Vite HMR injects real styles
(function() {
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeName === 'STYLE' && node.dataset.viteDevId) {
          // Remove matching temporary link tags (regular CSS)
          var links = document.querySelectorAll('link[data-temp-css]');
          links.forEach(function(link) {
            if (node.dataset.viteDevId.endsWith(link.getAttribute('href'))) {
              link.remove();
            }
          });

          // Remove matching temporary style tags (CSS modules)
          var styles = document.querySelectorAll('style[data-temp-css]');
          styles.forEach(function(style) {
            if (style.dataset.viteDevId === node.dataset.viteDevId) {
              style.remove();
            }
          });

          // Self-cleanup when all temp elements are gone
          if (!document.querySelector('[data-temp-css]')) {
            observer.disconnect();
            var script = document.querySelector('script[data-temp-css-cleanup]');
            if (script) script.remove();
          }
        }
      });
    });
  });
  observer.observe(document.head, { childList: true });
})();
</script>`;
}

/**
 * Render a page with SSR and inject dynamic content
 * @param {Object} options - Rendering options
 * @param {string} options.pageName - Name of the page (e.g., 'home', 'about')
 * @param {Object} options.pageContext - Data to pass to the page component
 * @param {string} options.urlPathname - URL pathname for the request
 * @param {string} [options.headPrepend=''] - HTML to inject in <!--app-head-prepend--> (for page-specific meta, title, etc.)
 * @param {string} [options.bodyHtml=''] - HTML to inject in <!--app-body--> (for additional body content)
 * @returns {Promise<string>} Final HTML string
 */
export async function renderPage({
  pageName,
  pageContext,
  urlPathname,
  headPrepend = '',
  bodyHtml = ''
}) {
  try {
    // Load and render page component
    let pageModule;
    let pageHtml;

    if (isProduction) {
      // Production: Import SSR build
      const ssrModulePath = path.join(root, `dist/server/pages/${pageName}/${pageName}.page.js`);
      pageModule = await import(ssrModulePath);
      pageHtml = pageModule.pageToHtml(pageContext, renderToString);
    } else {
      // Development: Use Vite SSR (dynamic import for dev-only dependency)
      const { getDevServer } = await import('./vite-dev-server.js');
      const viteDevServer = getDevServer();
      pageModule = await viteDevServer.ssrLoadModule(
        `/client/pages/${pageName}/${pageName}.page.jsx`
      );
      pageHtml = pageModule.pageToHtml(pageContext, renderToString);
    }

    // Load shared HTML template
    let html;
    if (isProduction) {
      // Cache template in production
      if (!templateCache) {
        const templatePath = path.join(root, 'dist/client/template.html');
        templateCache = await fs.readFile(templatePath, 'utf-8');
      }
      html = templateCache;
    } else {
      // Always read fresh in development
      const templatePath = path.join(root, 'client/template.html');
      html = await fs.readFile(templatePath, 'utf-8');
    }

    const coreHeadTags = [];

    // Inject page-specific script and dependencies
    if (isProduction) {
      // Load manifest (cached after first load)
      if (!manifestCache) {
        const manifestPath = path.join(root, 'dist/client/.vite/manifest.json');
        manifestCache = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      }
      const manifest = manifestCache;

      const pageEntry = `client/pages/${pageName}/${pageName}.page.jsx`;
      const entry = manifest[pageEntry];

      if (!entry) {
        throw new Error(`Could not find build output for ${pageEntry} in manifest`);
      }

      // Recursively collect all imports and their CSS
      const allImports = new Set();
      const allCss = new Set();

      // Recursive function to collect imports
      const collectDependencies = (entryKey, manifestData, imports, css) => {
        const entryData = manifestData[entryKey];
        if (!entryData) return;

        // Collect CSS from this entry
        if (entryData.css && entryData.css.length > 0) {
          entryData.css.forEach(cssFile => css.add(cssFile));
        }

        // Recursively collect imports
        if (entryData.imports && entryData.imports.length > 0) {
          entryData.imports.forEach(importKey => {
            if (!imports.has(importKey)) {
              imports.add(importKey);
              collectDependencies(importKey, manifestData, imports, css); // Recurse
            }
          });
        }
      };

      // Start with the main entry's CSS
      if (entry.css && entry.css.length > 0) {
        entry.css.forEach(cssFile => allCss.add(cssFile));
      }

      // Collect all transitive dependencies
      if (entry.imports && entry.imports.length > 0) {
        entry.imports.forEach(importKey => {
          if (!allImports.has(importKey)) {
            allImports.add(importKey);
            collectDependencies(importKey, manifest, allImports, allCss);
          }
        });
      }

      // Gather CSS tags
      Array.from(allCss).forEach(cssFile => {
        coreHeadTags.push(`<link rel="stylesheet" crossorigin href="${publicURLPath}/${cssFile}">`);
      });

      // Add modulepreload tags (to fetch dependencies early)
      Array.from(allImports).forEach(importKey => {
        const importEntry = manifest[importKey];
        coreHeadTags.push(`<link rel="modulepreload" crossorigin href="${publicURLPath}/${importEntry.file}">`);
      });

      // Inject main script
      const scriptTag = `<script type="module" crossorigin src="${publicURLPath}/${entry.file}"></script>`;
      html = html.replace('<!--app-script-->', scriptTag);
    } else {
      // Development: Inject page script and collect CSS to prevent FOUC
      const { getDevServer } = await import('./vite-dev-server.js');
      const viteDevServer = getDevServer();

      const scriptTag = `<script type="module" src="/client/pages/${pageName}/${pageName}.page.jsx"></script>`;
      html = html.replace('<!--app-script-->', scriptTag);

      // Transform entry to populate module graph, then collect CSS
      const entryUrl = `/client/pages/${pageName}/${pageName}.page.jsx`;
      await viteDevServer.transformRequest(entryUrl);
      const cssFiles = await collectDevCSS(viteDevServer, entryUrl);

      // Inject temporary CSS (removed after Vite injects style tags)
      if (cssFiles.length > 0) {
        const cssTags = cssFiles.map(({ url, content, isModule }) => {
          if (isModule) {
            // CSS module: inject transformed CSS inline
            return `<style type="text/css" data-vite-dev-id="${url}" data-temp-css>\n${content}\n</style>`;
          }
          // Regular CSS: inject as link tag
          return `<link rel="stylesheet" href="${url}" data-temp-css>`;
        }).join('\n    ');

        coreHeadTags.unshift(cssTags);
        coreHeadTags.unshift(getDevCSSCleanupScript());
      }

      // Let Vite transform the HTML (handles HMR, etc.)
      html = await viteDevServer.transformIndexHtml(urlPathname, html);
    }

    // Add page data JSON and common head tags (after environment-specific setup)
    coreHeadTags.push(
      `<script>window.pageContext=${stringify(pageContext)};</script>`,
      `<script src="${publicURLPath}/instant.page-5.2.0.js" type="module" fetchpriority="low"></script>`
    );

    // Inject all content into placeholders
    const finalHtml = html
      .replace('<!--app-head-prepend-->', headPrepend)
      .replace('<!--app-head-core-->', coreHeadTags.join('\n    '))
      .replace('<!--app-html-->', pageHtml)
      .replace('<!--app-body-->', bodyHtml);

    return finalHtml;
  } catch (error) {
    console.error(`Error rendering ${pageName} page:`, error);
    throw error;
  }
}
