import { hydrate } from 'preact'
import { Counter } from './Counter'
import { HomeLayout } from '../../layouts/HomeLayout'

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
  )
}

// Client side hydration
if (typeof window !== 'undefined') {
  // Giant Island - for demo purpose.
  // You can add split into proper/smaller islands and contexts and hydrate only those
  const body = document.querySelector('body')
  hydrate(<Page pageContext={window.pageContext} />, body)
}

// Server render helper
// Not importing 'preact-render-to-string'.renderToString directly,
// because it will end up unnecessarily in the client side bundle
function pageToHtml(pageContext, renderToString) {
  return renderToString(<Page pageContext={pageContext} />)
}

export { pageToHtml }
