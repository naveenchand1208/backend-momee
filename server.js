// const http = require('http')
// const app = require('./app/app')
// require('dotenv').config()

// var port = process.env.HTTP_PORT
// var host = process.env.HTTP_HOST

// //to create http server and connect app.js
// var server = http.createServer(app)

// server.listen(port, host, () => {
//     console.log(`server listening on http://${host}:${port}`)
// })

// const http = require('http');
// const app = require('./app/app');
// const dotenv = require('dotenv');
// const fs = require('fs');

// // Load correct .env file based on NODE_ENV
// const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
// console.log('ENV loaded from:', envFile);
// console.log('IMAGEKIT_PUBLIC_KEY:', process.env.IMAGEKIT_PUBLIC_KEY);

// if (fs.existsSync(envFile)) {
//   dotenv.config({ path: envFile });
// } else {
//   dotenv.config(); // fallback to default .env
// }

// const port = process.env.HTTP_PORT || 3000;
// const host = process.env.HTTP_HOST || 'localhost';

// const server = http.createServer(app);

// server.listen(port, host, () => {
//   console.log(`Server running on http://${host}:${port} [${process.env.NODE_ENV}]`);
// });

// require('./app/config/env'); // ⬅️ Load environment config first
// const http = require('http');
// const app = require('./app/app');

// const port = process.env.HTTP_PORT || 3000;
// const host = process.env.HTTP_HOST || 'localhost';

// const server = http.createServer(app);
// require('./app/socket')(server);
// server.listen(port, host, () => {
//   console.log(`Server running on http://${host}:${port} [${process.env.NODE_ENV}]`);
// });


require('./app/config/env'); // Load .env first

const http = require('http');
const app = require('./app/app');
// console.log('process.env', process.env)
const port = process.env.HTTP_PORT || 3000;
const host = process.env.HTTP_HOST || 'localhost';

const server = http.createServer(app);

// ⬅️ Pass `app` as second argument so `io` can be attached to it
require('./app/socket')(server, app);

server.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port} [${process.env.NODE_ENV}]`);
});
