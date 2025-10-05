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
      // Development: Inject page script and let Vite transform
      const { getDevServer } = await import('./vite-dev-server.js');
      const viteDevServer = getDevServer();

      const scriptTag = `<script type="module" src="/client/pages/${pageName}/${pageName}.page.jsx"></script>`;
      html = html.replace('<!--app-script-->', scriptTag);

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
