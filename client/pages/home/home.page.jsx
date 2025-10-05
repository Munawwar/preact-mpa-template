import { hydrate } from 'preact';
import { Counter } from './Counter';
import { HomeLayout } from '../../layouts/HomeLayout';

function Page({ pageContext }) {
  return (
    <HomeLayout pageContext={pageContext}>
      <h1>Welcome</h1>
      This page is:
      <ul>
        <li>Rendered to HTML.</li>
        <li>
          Interactive. <Counter initialState={pageContext.counter} />
        </li>
      </ul>
    </HomeLayout>
  );
}

// Client side hydration (only runs in browser, not during SSR)
if (!import.meta.env.SSR) {
  const body = document.querySelector('#root');
  hydrate(<Page pageContext={window.pageContext} />, body);

  // Vite HMR
  if (import.meta.hot) {
    import.meta.hot.accept();
  }
}

// Server render helper
// Not importing 'preact-render-to-string'.renderToString directly,
// because it will end up unnecessarily in the client side bundle
function pageToHtml(pageContext, renderToString) {
  return renderToString(<Page pageContext={pageContext} />);
}

export { pageToHtml };
