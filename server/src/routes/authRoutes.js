const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, query } = require('../database');
const { JWT_SECRET, verifyAuth } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/securityMiddleware');
const { loginSchema } = require('../utils/validationSchemas');
const { logSecurityEvent } = require('../utils/logger');

// POST /api/auth/login - Secure login with HttpOnly Cookie
router.post('/login', loginLimiter, async (req, res) => {
  try {
    // Validate request body schema
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Telefone e senha são obrigatórios.' });
    }

    const { phone, password } = parseResult.data;
    const cleanPhone = phone.replace(/\D/g, '');

    // Search user by clean phone
    const user = await queryOne('SELECT * FROM users WHERE phone = ? OR phone = ?', [phone, cleanPhone]);

    if (!user) {
      logSecurityEvent('LOGIN_FAILED_UNKNOWN_USER', { phone, ip: req.ip });
      return res.status(401).json({ error: 'Telefone ou senha incorretos.' });
    }

    if (user.status === 'BLOCKED') {
      logSecurityEvent('LOGIN_FAILED_BLOCKED_USER', { userId: user.id, phone, ip: req.ip });
      return res.status(403).json({ error: 'Sua conta está suspensa. Entre em contato com o suporte.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logSecurityEvent('LOGIN_FAILED_WRONG_PASSWORD', { userId: user.id, phone, ip: req.ip });
      return res.status(401).json({ error: 'Telefone ou senha incorretos.' });
    }

    // Sign JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set Secure HttpOnly Cookie with Wildcard Domain Support
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.duoimportados.com.br' : undefined);
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logSecurityEvent('LOGIN_SUCCESS', { userId: user.id, role: user.role, ip: req.ip });

    return res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Erro interno no servidor ao realizar login.' });
  }
});

// POST /api/auth/logout - Clear HttpOnly Cookie
router.post('/logout', (req, res) => {
  const token = req.cookies?.auth_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      logSecurityEvent('LOGOUT_SUCCESS', { userId: decoded.userId, ip: req.ip });
    } catch (e) {}
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.duoimportados.com.br' : undefined);

  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'lax',
    ...(cookieDomain ? { domain: cookieDomain } : {})
  });

  return res.json({ message: 'Logout realizado com sucesso.' });
});

// GET /api/auth/me - Verify session & return user profile
router.get('/me', verifyAuth, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, name, phone, role, status, created_at FROM users WHERE id = ?', [req.user.userId]);

    if (!user || user.status === 'BLOCKED') {
      res.clearCookie('auth_token', {
        ...(cookieDomain ? { domain: cookieDomain } : {})
      });
      return res.status(401).json({ error: 'Sessão inválida ou conta bloqueada.' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar sessão.' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', verifyAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.userId]);

    logSecurityEvent('PASSWORD_CHANGED', { userId: req.user.userId, ip: req.ip });

    return res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

module.exports = router;
