const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET
const expiresIn = process.env.JWT_TOKEN_EXPIRATION

const generateToken = (payload) => {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    // expiresIn,
  });
};

module.exports = generateToken;
