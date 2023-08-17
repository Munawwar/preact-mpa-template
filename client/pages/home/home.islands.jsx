import { hydrate } from 'preact';
import { Counter } from './Counter';

function Island1({ pageContext }) {
  return (
    <ul>
      <li>Rendered to HTML.</li>
      <li>
        Interactive. <Counter initialState={pageContext.counter} />
      </li>
    </ul>
  );
}

// Make part of the HTML interactive
if (typeof window !== 'undefined') {
  const el = document.getElementById('island1');
  hydrate(<Island1 pageContext={window.pageContext} />, el);
}

export { Island1 };
