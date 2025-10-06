import { HomeLayout } from '../../layouts/HomeLayout';
import initializePage from '../../page-common';
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

export const { pageToHtml } = initializePage(Page);
