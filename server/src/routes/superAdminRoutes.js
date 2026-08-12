const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, queryOne } = require('../database');
const { verifyAuth, requireRole } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { createSellerSchema } = require('../utils/validationSchemas');
const { logSecurityEvent } = require('../utils/logger');

// Strict Protection: Require Authentication AND SUPER_ADMIN role
router.use(verifyAuth);
router.use(requireRole('SUPER_ADMIN'));
router.use(sanitizeBody);

// GET /api/super-admin/sellers - List all sellers with summary metrics
router.get('/sellers', async (req, res) => {
  try {
    const sellers = await query(
      `SELECT u.id, u.name, u.phone, u.role, u.status, u.created_at,
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT s.id) as total_sales,
        COALESCE(SUM(s.total_value), 0) as total_gross_sales
       FROM users u
       LEFT JOIN customers c ON c.owner_id = u.id
       LEFT JOIN sales s ON s.owner_id = u.id
       WHERE u.role = 'SELLER'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    return res.json(sellers);
  } catch (err) {
    console.error('Error fetching sellers:', err);
    return res.status(500).json({ error: 'Erro ao listar vendedores.' });
  }
});

// POST /api/super-admin/sellers - Create New Seller Account
router.post('/sellers', async (req, res) => {
  try {
    const parseResult = createSellerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados inválidos.' });
    }

    const { name, phone, password } = parseResult.data;
    const cleanPhone = phone.replace(/\D/g, '');

    // Check if phone is already registered
    const existing = await queryOne('SELECT id FROM users WHERE phone = ? OR phone = ?', [phone, cleanPhone]);
    if (existing) {
      return res.status(400).json({ error: 'Este número de telefone já está cadastrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, phone, password_hash, role, status) VALUES (?, ?, ?, 'SELLER', 'ACTIVE')`,
      [name, phone, passwordHash]
    );

    const newSellerId = result[0]?.id || result.insertId;

    // Seed default expense categories for the new seller
    const defaultCategories = ['Compra de mercadoria', 'Combustível', 'Internet', 'Embalagem', 'Transporte', 'Aluguel'];
    for (const cat of defaultCategories) {
      await query(`INSERT INTO expense_categories (owner_id, name) VALUES (?, ?)`, [newSellerId, cat]);
    }

    logSecurityEvent('ADMIN_SELLER_CREATED', {
      adminUserId: req.user.userId,
      newSellerId,
      sellerName: name,
      phone,
      ip: req.ip
    });

    return res.status(201).json({
      message: 'Conta de vendedor criada com sucesso!',
      seller: { id: newSellerId, name, phone, role: 'SELLER', status: 'ACTIVE' }
    });
  } catch (err) {
    console.error('Error creating seller:', err);
    return res.status(500).json({ error: 'Erro ao criar conta de vendedor.' });
  }
});

// PUT /api/super-admin/sellers/:id/status - Block/Unblock Seller Account
router.put('/sellers/:id/status', async (req, res) => {
  try {
    const sellerId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(sellerId)) return res.status(400).json({ error: 'ID inválido.' });
    if (!['ACTIVE', 'BLOCKED'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use ACTIVE ou BLOCKED.' });
    }

    const seller = await queryOne('SELECT id, name FROM users WHERE id = ? AND role = "SELLER"', [sellerId]);
    if (!seller) {
      return res.status(404).json({ error: 'Vendedor não encontrado.' });
    }

    await query('UPDATE users SET status = ? WHERE id = ?', [status, sellerId]);

    logSecurityEvent('ADMIN_SELLER_STATUS_CHANGED', {
      adminUserId: req.user.userId,
      sellerId,
      newStatus: status,
      ip: req.ip
    });

    return res.json({ message: `Status do vendedor alterado para ${status}.` });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao alterar status do vendedor.' });
  }
});

// PUT /api/super-admin/sellers/:id/reset-password - Reset Seller Password
router.put('/sellers/:id/reset-password', async (req, res) => {
  try {
    const sellerId = parseInt(req.params.id);
    const { new_password } = req.body;

    if (isNaN(sellerId)) return res.status(400).json({ error: 'ID inválido.' });
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const seller = await queryOne('SELECT id FROM users WHERE id = ? AND role = "SELLER"', [sellerId]);
    if (!seller) {
      return res.status(404).json({ error: 'Vendedor não encontrado.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, sellerId]);

    logSecurityEvent('ADMIN_SELLER_PASSWORD_RESET', {
      adminUserId: req.user.userId,
      sellerId,
      ip: req.ip
    });

    return res.json({ message: 'Senha do vendedor redefinida com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

module.exports = router;
