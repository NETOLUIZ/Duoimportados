const rateLimit = require('express-rate-limit');
const { logSecurityEvent } = require('../utils/logger');

// 1. Login Rate Limiter: Max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Por favor, aguarde 15 minutos.' },
  handler: (req, res, next, options) => {
    logSecurityEvent('RATE_LIMIT_LOGIN_EXCEEDED', { ip: req.ip, path: req.path });
    res.status(429).json(options.message);
  }
});

// 2. General API Rate Limiter: Max 300 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de requisições excedido. Tente novamente mais tarde.' }
});

// 3. Mass-Assignment & Parameter Pollution Prevention Middleware
// Removes any client-injected owner_id, user_id, role, or created_at fields from req.body
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    delete req.body.owner_id;
    delete req.body.user_id;
    delete req.body.role;
    delete req.body.status; // Protected unless specifically handled by server logic
    delete req.body.created_at;
    delete req.body.updated_at;
  }
  next();
}

module.exports = {
  loginLimiter,
  apiLimiter,
  sanitizeBody
};
