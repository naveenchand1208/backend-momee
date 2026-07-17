// app/config/env.js
const dotenv = require('dotenv');
const fs = require('fs');

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';

if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    console.log(`[env.js] Loaded env from: ${envFile}`);
} else {
    dotenv.config(); // fallback
    console.log(`[env.js] Loaded fallback .env`);
}
