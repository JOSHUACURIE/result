const crypto = require('crypto');

// Generate a 256-bit (32-byte) cryptographically secure random secret
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET=', jwtSecret);