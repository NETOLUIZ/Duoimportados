const jwt = require('jsonwebtoken');
const { logSecurityEvent } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_importados_crediario_key_2026';

function verifyAuth(req, res, next) {
  // Extract token from HttpOnly cookie first, then Authorization header as fallback
  let token = req.cookies?.auth_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Acesso não autorizado. Por favor, faça login.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Strict Owner Scope:
    // If user is SUPER_ADMIN and impersonating/viewing a seller via query param or header, handle safely,
    // otherwise req.ownerId is ALWAYS req.user.userId
    req.ownerId = decoded.userId;

    next();
  } catch (err) {
    logSecurityEvent('INVALID_TOKEN_ATTEMPT', { path: req.path, ip: req.ip, message: err.message });
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logSecurityEvent('FORBIDDEN_ROLE_ACCESS', { 
        userId: req.user?.userId, 
        role: req.user?.role, 
        requiredRoles: roles,
        path: req.path 
      });
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
    }
    next();
  };
}

module.exports = {
  verifyAuth,
  requireRole,
  JWT_SECRET
};
