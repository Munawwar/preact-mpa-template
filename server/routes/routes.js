export default [{
  method: 'GET',
  pattern: '/', // Express.js pattern. check Express.js documentation
  handler: './home/get-home.js'
}, {
  method: 'GET',
  pattern: '/about',
  handler: './about/get-about.js'
}];
