import { useState } from 'preact/hooks';
import './Counter.css';

export { Counter };

function Counter ({ initialState = 0 }) {
  const [count, setCount] = useState(initialState);
  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Counter {count}
    </button>
  );
}
