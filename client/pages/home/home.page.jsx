import { Counter } from './Counter';
import { HomeLayout } from '../../layouts/HomeLayout';
import initializePage from '../../page-common';

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

export const { pageToHtml } = initializePage(Page);
