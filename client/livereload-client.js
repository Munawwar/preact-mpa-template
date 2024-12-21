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
          const linkToRemove = document.querySelector(`link[href*="${url}?"]`) ||
              document.querySelector(`link[href="${url}"]`);
          if (linkToRemove) {
            linkToRemove.parentNode.removeChild(linkToRemove);
          }
        });

        replace.forEach(({ oldUrl, newUrl }) => {
          const oldLink = document.querySelector(`link[href*="${oldUrl}?"]`) ||
              document.querySelector(`link[href="${oldUrl}"]`);
          if (oldLink) {
            const updatedLink = document.createElement('link');
            updatedLink.rel = 'stylesheet';
            updatedLink.href = newUrl;
            oldLink.parentNode.insertBefore(updatedLink, oldLink.nextSibling);
            setTimeout(() => oldLink.parentNode.removeChild(oldLink), 50);
          }
        });
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
