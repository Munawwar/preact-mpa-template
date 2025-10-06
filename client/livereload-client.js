(() => {
  let ws;
  let reconnectTimer;
  let retryCount = 0;
  const MAX_RETRY_COUNT = 15;
  const INITIAL_RETRY_INTERVAL = 1000;

  function connect() {
    if (!navigator.onLine) return;
    ws = new WebSocket(`ws://${location.hostname}:35729`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'css') {
        const { remove = [], replace = [] } = data.operations || {};

        remove.forEach(url => {
          const linkToRemove = document.querySelector(`link[href="${url}"]`);
          if (linkToRemove) {
            linkToRemove.parentNode.removeChild(linkToRemove);
          }
        });

        replace.forEach(({ oldUrl, newUrl }) => {
          const oldLink = document.querySelector(`link[href="${oldUrl}"]`);
          if (oldLink) {
            const updatedLink = document.createElement('link');
            updatedLink.rel = 'stylesheet';
            updatedLink.href = newUrl;
            oldLink.parentNode.insertBefore(updatedLink, oldLink.nextSibling);
            setTimeout(() => oldLink.remove(), 50);
          }
        });
      } else if (data.type === 'js') {
        const { remove = [], replace = [] } = data.operations || {};

        // Pattern detection
        const isPageChunk = (url) => /\/pages\/.*\.page-[A-Z0-9]+\.js$/i.test(url);
        const isSharedChunk = (url) => /\/chunk-[A-Z0-9]+\.js$/i.test(url);

        // Track if we need to do a full reload
        let needsReload = false;

        // Handle removals intelligently
        if (remove.length > 0) {
          const relevantRemoves = remove.filter(url => {
            if (isPageChunk(url)) {
              // Page chunk - only reload if it's loaded on current page
              return !!document.querySelector(`script[src="${url}"]`);
            }
            if (isSharedChunk(url)) {
              // Shared chunk - just clean up preload tag, don't reload
              // Page changes in the batch will handle reload if needed
              const preload = document.querySelector(`link[rel="modulepreload"][href="${url}"]`);
              if (preload) {
                preload.remove();
                console.log('[HMR] Removed shared chunk preload:', url);
              }
              return false; // Don't trigger reload for chunk removal
            }
            // Unknown JS - assume it matters, trigger reload
            return true;
          });

          if (relevantRemoves.length > 0) {
            console.log('[HMR] Current page JS removed, reloading');
            window.location.reload();
            return;
          }
        }

        // Handle replacements
        replace.forEach(({ oldUrl, newUrl }) => {
          if (isPageChunk(oldUrl)) {
            // Page chunk - check if it's loaded in current page
            const oldScript = document.querySelector(`script[type="module"][src="${oldUrl}"]`);

            if (!oldScript) {
              // Not the current page, ignore this change
              console.log('[HMR] Ignoring page chunk (not current page):', oldUrl);
              return;
            }

            // It's our page chunk - try HMR
            // Update modulepreload links for this page
            const oldPreload = document.querySelector(`link[rel="modulepreload"][href="${oldUrl}"]`);
            if (oldPreload) {
              const newPreload = document.createElement('link');
              newPreload.rel = 'modulepreload';
              newPreload.href = newUrl;
              oldPreload.parentNode.insertBefore(newPreload, oldPreload.nextSibling);
              setTimeout(() => oldPreload.remove(), 50);
            }

            // Unmount the current page if unmount function exists
            if (window._unmount) {
              window._unmount();
              window._unmount = undefined;
            }

            // Replace the script tag
            const newScript = document.createElement('script');
            newScript.type = 'module';
            newScript.src = newUrl;

            // Error handling
            newScript.onerror = () => {
              console.error('[HMR] Failed to load module, performing full reload');
              window.location.reload();
            };

            newScript.onload = () => {
              console.log('[HMR] Page module reloaded successfully');
            };

            oldScript.parentNode.insertBefore(newScript, oldScript.nextSibling);
            setTimeout(() => oldScript.remove(), 50);
          } else if (isSharedChunk(oldUrl)) {
            // Shared chunk - just update modulepreload, don't reload
            // If this chunk matters, a page.js change will follow in the batch
            const oldPreload = document.querySelector(`link[rel="modulepreload"][href="${oldUrl}"]`);
            if (oldPreload) {
              console.log('[HMR] Updating shared chunk preload:', oldUrl);
              const newPreload = document.createElement('link');
              newPreload.rel = 'modulepreload';
              newPreload.href = newUrl;
              oldPreload.parentNode.insertBefore(newPreload, oldPreload.nextSibling);
              setTimeout(() => oldPreload.remove(), 50);
            }
            // Don't reload - trust that page changes will handle it if needed
          } else {
            // Unknown JS pattern (not page chunk, not shared chunk) - reload to be safe
            console.log('[HMR] Non-build JS changed, performing full reload:', oldUrl);
            needsReload = true;
          }
        });

        if (needsReload) {
          window.location.reload();
        }
      } else {
        window.location.reload();
      }
    };

    ws.onopen = () => {
      retryCount = 0; // Reset count on successful connection
    };

    ws.onclose = () => {
      if (navigator.onLine && retryCount < MAX_RETRY_COUNT) {
        // exponential backoff
        const backoffTime = INITIAL_RETRY_INTERVAL * Math.pow(2, retryCount);
        retryCount++;
        reconnectTimer = setTimeout(connect, backoffTime);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  window.addEventListener('online', () => {
    retryCount = 0;
    connect();
  });
  window.addEventListener('offline', () => {
    clearTimeout(reconnectTimer);
    ws?.close();
  });

  connect();
})();
