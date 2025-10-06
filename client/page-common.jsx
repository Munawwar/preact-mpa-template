import { hydrate, render } from 'preact';

/* global __DEV__ */

export default function initializePage(Page) {
  let pageToHtml;
  if (typeof window !== 'undefined') {
    const body = document.querySelector('#root');
    hydrate(<Page pageContext={window.pageContext} />, body);
    if (__DEV__) {
      if (window._unmount) {
        window._unmount();
      }
      window._unmount = function unmount() {
        render(null, body);
      };
    }
  } else {
    // Server render helper
    // Not importing 'preact-render-to-string'.renderToString directly,
    // because it will end up unnecessarily in the client side bundle
    pageToHtml = function pageToHtml(data, renderToString) {
      return renderToString(<Page pageContext={data} />);
    };
  }

  return { pageToHtml };
}
