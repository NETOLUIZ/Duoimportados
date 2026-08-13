const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, query } = require('../database');
const { JWT_SECRET, verifyAuth } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/securityMiddleware');
const { loginSchema } = require('../utils/validationSchemas');
const { logSecurityEvent } = require('../utils/logger');

const { logAudit } = require('../utils/auditLogger');

// POST /api/auth/login - Secure login by Name or Phone with HttpOnly Cookie
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Nome/Telefone e senha são obrigatórios.' });
    }

    const identifier = (req.body.login || req.body.phone || '').trim();
    const { password } = parseResult.data;
    const cleanPhone = identifier.replace(/\D/g, '');

    // Search user by name OR phone
    let user = null;
    if (cleanPhone.length >= 8) {
      user = await queryOne(
        'SELECT * FROM users WHERE phone = ? OR phone = ? OR LOWER(TRIM(name)) = LOWER(TRIM(?))',
        [identifier, cleanPhone, identifier]
      );
    } else {
      user = await queryOne(
        'SELECT * FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR phone = ?',
        [identifier, identifier]
      );
    }

    if (!user) {
      logSecurityEvent('LOGIN_FAILED_UNKNOWN_USER', { identifier, ip: req.ip });
      return res.status(401).json({ error: 'Nome/Telefone ou senha incorretos.' });
    }

    if (user.status === 'BLOCKED') {
      logSecurityEvent('LOGIN_FAILED_BLOCKED_USER', { userId: user.id, identifier, ip: req.ip });
      return res.status(403).json({ error: 'Sua conta está suspensa. Entre em contato com o suporte.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logSecurityEvent('LOGIN_FAILED_WRONG_PASSWORD', { userId: user.id, identifier, ip: req.ip });
      return res.status(401).json({ error: 'Nome/Telefone ou senha incorretos.' });
    }

    const effectiveOwnerId = user.owner_id || user.id;

    // Sign JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        ownerId: effectiveOwnerId,
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

    // Log Audit Event
    await logAudit(
      { ownerId: effectiveOwnerId, user: { userId: user.id, name: user.name }, ip: req.ip },
      'SESSAO_LOGIN',
      { message: `Usuário ${user.name} efetuou login no sistema.` }
    );

    return res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        ownerId: effectiveOwnerId,
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
    const user = await queryOne('SELECT id, name, phone, role, status, owner_id, created_at FROM users WHERE id = ?', [req.user.userId]);

    if (!user || user.status === 'BLOCKED') {
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieDomain = process.env.COOKIE_DOMAIN || (isProduction ? '.duoimportados.com.br' : undefined);
      res.clearCookie('auth_token', {
        ...(cookieDomain ? { domain: cookieDomain } : {})
      });
      return res.status(401).json({ error: 'Sessão inválida ou conta bloqueada.' });
    }

    return res.json({
      ...user,
      ownerId: user.owner_id || user.id
    });
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
    await logAudit(req, 'SENHA_ALTERADA', { message: `Usuário ${req.user.name} alterou sua senha.` });

    return res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

// GET /api/auth/operators - List sub-users (operators) for store owner
router.get('/operators', verifyAuth, async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const operators = await query(
      `SELECT id, name, phone, role, status, created_at FROM users 
       WHERE owner_id = ? AND id != ?
       ORDER BY created_at DESC`,
      [ownerId, ownerId]
    );
    return res.json(operators);
  } catch (err) {
    console.error('Error fetching operators:', err);
    return res.status(500).json({ error: 'Erro ao listar operadores.' });
  }
});

// POST /api/auth/operators - Create sub-user (operator)
router.post('/operators', verifyAuth, async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const { name, phone, password, role } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome do operador é obrigatório.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 4 caracteres.' });
    }

    const operatorRole = role === 'ADMIN' ? 'ADMIN' : 'OPERATOR';
    const operatorPhone = phone ? phone.trim() : `op_${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await queryOne('SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND owner_id = ?', [name.trim(), ownerId]);
    if (existing) {
      return res.status(400).json({ error: 'Já existe um operador com este nome.' });
    }

    const inserted = await query(
      `INSERT INTO users (name, phone, password_hash, role, status, owner_id)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      [name.trim(), operatorPhone, passwordHash, operatorRole, ownerId]
    );

    const newOpId = inserted[0]?.id || inserted.insertId;

    await logAudit(req, 'OPERADOR_CRIADO', {
      message: `Novo operador "${name.trim()}" cadastrado pelo usuário ${req.user.name}.`,
      operatorId: newOpId,
      role: operatorRole
    });

    return res.status(201).json({
      message: 'Operador cadastrado com sucesso!',
      operator: { id: newOpId, name: name.trim(), phone: operatorPhone, role: operatorRole }
    });
  } catch (err) {
    console.error('Error creating operator:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar operador.' });
  }
});

// DELETE /api/auth/operators/:id - Delete operator
router.delete('/operators/:id', verifyAuth, async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const operatorId = req.params.id;

    const op = await queryOne('SELECT id, name FROM users WHERE id = ? AND owner_id = ?', [operatorId, ownerId]);
    if (!op) {
      return res.status(404).json({ error: 'Operador não encontrado.' });
    }

    await query('DELETE FROM users WHERE id = ? AND owner_id = ?', [operatorId, ownerId]);

    await logAudit(req, 'OPERADOR_EXCLUIDO', {
      message: `Operador "${op.name}" foi removido pelo usuário ${req.user.name}.`,
      operatorId
    });

    return res.json({ message: 'Operador removido com sucesso.' });
  } catch (err) {
    console.error('Error deleting operator:', err);
    return res.status(500).json({ error: 'Erro ao remover operador.' });
  }
});

module.exports = router;
