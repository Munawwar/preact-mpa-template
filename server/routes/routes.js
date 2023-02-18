export default [{
  method: 'GET',
  pattern: '/',
  handler: './home/get-home.js'
}, {
  method: 'GET',
  pattern: '/about',
  handler: './about/get-about.js'
}];
