import browserSync from 'browser-sync';
import { distDirectory, root } from './paths.js';

const instance = browserSync.create();

instance.init({
  files: [distDirectory, `${root}/server/`],
  watch: true,
  port: 35729,
  // reloadDelay: 50,
  reloadDebounce: 50,
  notify: false,
  logSnippet: false,
  ui: false
});
