// Example context provider

import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

const Context = createContext(undefined);

function PageContextProvider({ pageContext, children }) {
  return <Context.Provider value={pageContext}>{children}</Context.Provider>;
}

function usePageContext() {
  const pageContext = useContext(Context);
  return pageContext;
}

export { PageContextProvider, usePageContext };
