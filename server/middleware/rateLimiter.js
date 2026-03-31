const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const max = parseInt(process.env.MAX_REQUESTS_PER_WINDOW) || 100;

const globalLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: `Too many requests. Please wait ${Math.round(windowMs / 60000)} minutes before retrying.`,
  },
  skip: (req) => req.method === 'GET' && req.path === '/api/health',
});

const addTrackerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.userEmail || req.ip,
  message: {
    success: false,
    message: 'Too many tracking requests. You can add up to 10 products every 10 minutes.',
  },
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many refresh requests. Please wait 5 minutes.',
  },
});

module.exports = { globalLimiter, addTrackerLimiter, refreshLimiter };
