import { hydrate } from 'preact';
import { HomeLayout } from '../../layouts/HomeLayout';
import './AboutPage.css';

function Page({ pageContext }) {
  return (
    <HomeLayout pageContext={pageContext}>
      <h1>About</h1>
      <p>
        <code class="code">SSR demo</code>
      </p>
    </HomeLayout>
  );
}

// Client side hydration
if (typeof window !== 'undefined') {
  const body = document.querySelector('#root');
  hydrate(<Page pageContext={window.pageContext} />, body);
}

// Server render helper
// Not importing 'preact-render-to-string'.renderToString directly,
// because it will end up unnecessarily in the client side bundle
function pageToHtml(data, renderToString) {
  return renderToString(<Page pageContext={data} />);
}

export { pageToHtml };
