const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { customerSchema } = require('../utils/validationSchemas');
const { logSecurityEvent } = require('../utils/logger');

// All customer routes require authentication and sanitize body
router.use(verifyAuth);
router.use(sanitizeBody);

// GET /api/customers - List customers with search and total debt summary
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const { search } = req.query;

    let sql = `
      SELECT c.*, 
        COALESCE(SUM(CASE WHEN i.status IN ('PENDENTE', 'VENCENDO', 'ATRASADA') THEN (i.amount - i.amount_paid) ELSE 0 END), 0) as total_debt,
        COUNT(DISTINCT s.id) as total_sales,
        SUM(CASE WHEN i.status = 'ATRASADA' THEN 1 ELSE 0 END) as overdue_count
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id AND s.owner_id = c.owner_id
      LEFT JOIN installments i ON i.customer_id = c.id AND i.owner_id = c.owner_id
      WHERE c.owner_id = ?
    `;

    const params = [ownerId];

    if (search && typeof search === 'string' && search.trim() !== '') {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.city LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ` GROUP BY c.id ORDER BY c.name ASC`;

    const customers = await query(sql, params);
    return res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
});

// GET /api/customers/:id - Customer profile with sales, installments, payments history
router.get('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'ID de cliente inválido.' });
    }

    const customer = await queryOne('SELECT * FROM customers WHERE id = ? AND owner_id = ?', [customerId, ownerId]);
    if (!customer) {
      logSecurityEvent('UNAUTHORIZED_IDOR_CUSTOMER_ACCESS', { userId: req.user.userId, customerId, ip: req.ip });
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    // Customer sales
    const sales = await query(
      `SELECT * FROM sales WHERE customer_id = ? AND owner_id = ? ORDER BY sale_date DESC`,
      [customerId, ownerId]
    );

    // Customer installments
    const installments = await query(
      `SELECT i.*, s.product_name 
       FROM installments i
       JOIN sales s ON s.id = i.sale_id
       WHERE i.customer_id = ? AND i.owner_id = ? 
       ORDER BY i.due_date ASC`,
      [customerId, ownerId]
    );

    // Customer payments
    const payments = await query(
      `SELECT p.*, i.installment_number, s.product_name
       FROM payments p
       JOIN installments i ON i.id = p.installment_id
       JOIN sales s ON s.id = i.sale_id
       WHERE p.customer_id = ? AND p.owner_id = ?
       ORDER BY p.payment_date DESC`,
      [customerId, ownerId]
    );

    return res.json({
      customer,
      sales,
      installments,
      payments
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do cliente.' });
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req, res) => {
  try {
    const parseResult = customerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados inválidos.' });
    }

    const ownerId = req.ownerId;
    const { name, phone, cep, address, number, complement, neighborhood, city, state, notes } = parseResult.data;

    const result = await query(
      `INSERT INTO customers 
       (owner_id, name, phone, cep, address, number, complement, neighborhood, city, state, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        name,
        phone || null,
        cep || null,
        address || null,
        number || null,
        complement || null,
        neighborhood || null,
        city || null,
        state || null,
        notes || null
      ]
    );

    logSecurityEvent('CUSTOMER_CREATED', { ownerId, customerName: name, ip: req.ip });

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso!',
      id: result[0]?.id || result.insertId
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ error: 'Erro ao cadastrar cliente.' });
  }
});

// PUT /api/customers/:id - Edit customer
router.put('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) return res.status(400).json({ error: 'ID inválido.' });

    const parseResult = customerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados inválidos.' });
    }

    const existing = await queryOne('SELECT id FROM customers WHERE id = ? AND owner_id = ?', [customerId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_CUSTOMER_EDIT', { userId: req.user.userId, customerId, ip: req.ip });
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const { name, phone, cep, address, number, complement, neighborhood, city, state, notes } = parseResult.data;

    await query(
      `UPDATE customers SET
        name = ?, phone = ?, cep = ?, address = ?, number = ?,
        complement = ?, neighborhood = ?, city = ?, state = ?, notes = ?
       WHERE id = ? AND owner_id = ?`,
      [
        name,
        phone || null,
        cep || null,
        address || null,
        number || null,
        complement || null,
        neighborhood || null,
        city || null,
        state || null,
        notes || null,
        customerId,
        ownerId
      ]
    );

    return res.json({ message: 'Cliente atualizado com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId)) return res.status(400).json({ error: 'ID inválido.' });

    const existing = await queryOne('SELECT id FROM customers WHERE id = ? AND owner_id = ?', [customerId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_CUSTOMER_DELETE', { userId: req.user.userId, customerId, ip: req.ip });
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    await query('DELETE FROM customers WHERE id = ? AND owner_id = ?', [customerId, ownerId]);
    logSecurityEvent('CUSTOMER_DELETED', { ownerId, customerId, ip: req.ip });

    return res.json({ message: 'Cliente excluído com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

module.exports = router;
