import { hydrate, render } from 'preact';

export default function initializePage(Page) {
  let unmount;
  let pageToHtml;
  if (typeof window !== 'undefined') {
    const body = document.querySelector('#root');
    hydrate(<Page pageContext={window.pageContext} />, body);
    unmount = function unmount() {
      render(null, body);
    };
  } else {
    // Server render helper
    // Not importing 'preact-render-to-string'.renderToString directly,
    // because it will end up unnecessarily in the client side bundle
    pageToHtml = function pageToHtml(data, renderToString) {
      return renderToString(<Page pageContext={data} />);
    };
  }

  return {
    pageToHtml,
    unmount
  };
}
