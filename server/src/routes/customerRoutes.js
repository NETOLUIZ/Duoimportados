const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { customerSchema } = require('../utils/validationSchemas');
const { logSecurityEvent } = require('../utils/logger');
const { logAudit } = require('../utils/auditLogger');
const { parseToCents, centsToDecimalString } = require('../utils/financialMath');

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
        COALESCE(
          (SELECT SUM(i.amount - i.amount_paid) 
           FROM installments i 
           WHERE i.customer_id = c.id AND i.owner_id = c.owner_id AND i.status IN ('PENDENTE', 'VENCENDO', 'ATRASADA')
          ), 0
        ) as total_debt,
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.owner_id = c.owner_id) as total_sales,
        COALESCE(
          (SELECT COUNT(*) 
           FROM installments i 
           WHERE i.customer_id = c.id AND i.owner_id = c.owner_id AND i.status = 'ATRASADA'
          ), 0
        ) as overdue_count
      FROM customers c
      WHERE c.owner_id = ?
    `;

    const params = [ownerId];

    if (search && typeof search === 'string' && search.trim() !== '') {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.city LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY c.name ASC`;

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

    // Aggregate financial summary across all sales to this customer
    const summary = sales.reduce((acc, s) => {
      acc.totalInvestedCents += parseToCents(s.product_value);
      acc.totalInterestCents += parseToCents(s.interest_value);
      acc.totalValueCents += parseToCents(s.total_value);
      return acc;
    }, { totalInvestedCents: 0, totalInterestCents: 0, totalValueCents: 0 });

    const totalReceivedCents = payments.reduce((sum, p) => sum + parseToCents(p.amount_paid), 0);

    return res.json({
      customer,
      sales,
      installments,
      payments,
      summary: {
        total_invested: centsToDecimalString(summary.totalInvestedCents),
        total_interest: centsToDecimalString(summary.totalInterestCents),
        total_value: centsToDecimalString(summary.totalValueCents),
        total_received: centsToDecimalString(totalReceivedCents)
      }
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
    const { name, phone, cep, address, number, complement, neighborhood, city, state, referred_by, notes } = parseResult.data;

    const result = await query(
      `INSERT INTO customers
       (owner_id, name, phone, cep, address, number, complement, neighborhood, city, state, referred_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        referred_by || null,
        notes || null
      ]
    );

    logSecurityEvent('CUSTOMER_CREATED', { ownerId, customerName: name, ip: req.ip });

    const customerId = result[0]?.id || result.insertId;
    await logAudit(req, 'CLIENTE_CRIADO', {
      message: `Cliente "${name}" cadastrado.`,
      customerId,
      name
    });

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso!',
      id: customerId
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

    const existing = await queryOne('SELECT * FROM customers WHERE id = ? AND owner_id = ?', [customerId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_CUSTOMER_EDIT', { userId: req.user.userId, customerId, ip: req.ip });
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const { name, phone, cep, address, number, complement, neighborhood, city, state, referred_by, notes } = parseResult.data;
    const nextValues = {
      name, phone: phone || null, cep: cep || null, address: address || null, number: number || null,
      complement: complement || null, neighborhood: neighborhood || null, city: city || null,
      state: state || null, referred_by: referred_by || null, notes: notes || null
    };

    await query(
      `UPDATE customers SET
        name = ?, phone = ?, cep = ?, address = ?, number = ?,
        complement = ?, neighborhood = ?, city = ?, state = ?, referred_by = ?, notes = ?
       WHERE id = ? AND owner_id = ?`,
      [
        nextValues.name, nextValues.phone, nextValues.cep, nextValues.address, nextValues.number,
        nextValues.complement, nextValues.neighborhood, nextValues.city, nextValues.state,
        nextValues.referred_by, nextValues.notes,
        customerId,
        ownerId
      ]
    );

    const changedFields = Object.keys(nextValues).filter((key) => String(existing[key] ?? '') !== String(nextValues[key] ?? ''));
    logSecurityEvent('CUSTOMER_UPDATED', {
      ownerId,
      customerId,
      editedBy: req.user.userId,
      changedFields,
      before: Object.fromEntries(changedFields.map((k) => [k, existing[k]])),
      after: Object.fromEntries(changedFields.map((k) => [k, nextValues[k]])),
      ip: req.ip
    });

    await logAudit(req, 'CLIENTE_EDITADO', {
      message: `Cliente "${existing.name}" editado por ${req.user.name}.`,
      customerId,
      changedFields,
      before: Object.fromEntries(changedFields.map((k) => [k, existing[k]])),
      after: Object.fromEntries(changedFields.map((k) => [k, nextValues[k]]))
    });

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

    const existing = await queryOne('SELECT id, name FROM customers WHERE id = ? AND owner_id = ?', [customerId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_CUSTOMER_DELETE', { userId: req.user.userId, customerId, ip: req.ip });
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    await query('DELETE FROM customers WHERE id = ? AND owner_id = ?', [customerId, ownerId]);
    logSecurityEvent('CUSTOMER_DELETED', { ownerId, customerId, ip: req.ip });

    await logAudit(req, 'CLIENTE_EXCLUIDO', {
      message: `Cliente "${existing.name}" excluído por ${req.user.name}. Todas as vendas, parcelas e pagamentos dele foram apagados junto (exclusão em cascata).`,
      customerId,
      name: existing.name
    });

    return res.json({ message: 'Cliente excluído com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

module.exports = router;
