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
      <div class="banner" dangerouslySetInnerHTML={{ __html: pageContext.banner }} />
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
function pageToHtml(pageContext, renderToString) {
  return renderToString(<Page pageContext={pageContext} />);
}

export { pageToHtml };
