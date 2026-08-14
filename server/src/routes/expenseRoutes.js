const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { expenseSchema } = require('../utils/validationSchemas');
const { parseToCents, centsToDecimalString } = require('../utils/financialMath');
const { logSecurityEvent } = require('../utils/logger');
const { logAudit } = require('../utils/auditLogger');

router.use(verifyAuth);
router.use(sanitizeBody);

// GET /api/expenses - List seller expenses
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const { category, search, month } = req.query;

    let sql = `SELECT * FROM expenses WHERE owner_id = ?`;
    const params = [ownerId];

    if (category && typeof category === 'string' && category.trim() !== '') {
      sql += ` AND category_name = ?`;
      params.push(category.trim());
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      sql += ` AND (name LIKE ? OR notes LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (month && typeof month === 'string' && month.length === 7) {
      sql += ` AND expense_date LIKE ?`;
      params.push(`${month}%`);
    }

    sql += ` ORDER BY expense_date DESC, id DESC`;

    const expenses = await query(sql, params);
    return res.json(expenses);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar despesas.' });
  }
});

// GET /api/expenses/categories - List seller expense categories
router.get('/categories', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const categories = await query(
      `SELECT * FROM expense_categories WHERE owner_id = ? ORDER BY name ASC`,
      [ownerId]
    );

    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar categorias.' });
  }
});

// POST /api/expenses - Register Expense
router.post('/', async (req, res) => {
  try {
    const parseResult = expenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados de despesa inválidos.' });
    }

    const ownerId = req.ownerId;
    const { category_name, name, amount, expense_date, notes } = parseResult.data;

    const amountCents = parseToCents(amount);
    if (amountCents <= 0) {
      return res.status(400).json({ error: 'O valor da despesa deve ser maior que zero.' });
    }

    const amountDecimal = centsToDecimalString(amountCents);
    const dateStr = expense_date || new Date().toISOString().split('T')[0];

    const result = await query(
      `INSERT INTO expenses (owner_id, category_name, name, amount, expense_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerId, category_name, name, amountDecimal, dateStr, notes || null]
    );

    logSecurityEvent('EXPENSE_CREATED', { ownerId, category_name, name, amount: amountDecimal, ip: req.ip });

    const expenseId = result[0]?.id || result.insertId;
    await logAudit(req, 'DESPESA_CRIADA', {
      message: `Despesa "${name}" (${category_name}) registrada no valor de R$ ${amountDecimal}.`,
      expenseId,
      name,
      amount: amountDecimal
    });

    return res.status(201).json({
      message: 'Despesa registrada com sucesso!',
      id: expenseId
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    return res.status(500).json({ error: 'Erro ao registrar despesa.' });
  }
});

// PUT /api/expenses/:id - Edit Expense
router.put('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const expenseId = parseInt(req.params.id);

    if (isNaN(expenseId)) return res.status(400).json({ error: 'ID inválido.' });

    const existing = await queryOne('SELECT * FROM expenses WHERE id = ? AND owner_id = ?', [expenseId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_EXPENSE_EDIT', { userId: req.user.userId, expenseId, ip: req.ip });
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }

    const parseResult = expenseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados de despesa inválidos.' });
    }

    const { category_name, name, amount, expense_date, notes } = parseResult.data;

    const amountCents = parseToCents(amount);
    if (amountCents <= 0) {
      return res.status(400).json({ error: 'O valor da despesa deve ser maior que zero.' });
    }

    const amountDecimal = centsToDecimalString(amountCents);
    const dateStr = expense_date || existing.expense_date;

    await query(
      `UPDATE expenses SET category_name = ?, name = ?, amount = ?, expense_date = ?, notes = ? WHERE id = ? AND owner_id = ?`,
      [category_name, name, amountDecimal, dateStr, notes || null, expenseId, ownerId]
    );

    logSecurityEvent('EXPENSE_UPDATED', { ownerId, expenseId, ip: req.ip });
    await logAudit(req, 'DESPESA_EDITADA', {
      message: `Despesa "${existing.name}" editada por ${req.user.name}.`,
      expenseId,
      before: { name: existing.name, category_name: existing.category_name, amount: existing.amount, expense_date: existing.expense_date, notes: existing.notes },
      after: { name, category_name, amount: amountDecimal, expense_date: dateStr, notes: notes || null }
    });

    return res.json({ message: 'Despesa atualizada com sucesso!' });
  } catch (err) {
    console.error('Error updating expense:', err);
    return res.status(500).json({ error: 'Erro ao atualizar despesa.' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const expenseId = parseInt(req.params.id);

    if (isNaN(expenseId)) return res.status(400).json({ error: 'ID inválido.' });

    const existing = await queryOne('SELECT id, name, amount FROM expenses WHERE id = ? AND owner_id = ?', [expenseId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_EXPENSE_DELETE', { userId: req.user.userId, expenseId, ip: req.ip });
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }

    await query('DELETE FROM expenses WHERE id = ? AND owner_id = ?', [expenseId, ownerId]);
    logSecurityEvent('EXPENSE_DELETED', { ownerId, expenseId, ip: req.ip });
    await logAudit(req, 'DESPESA_EXCLUIDA', {
      message: `Despesa "${existing.name}" (R$ ${existing.amount}) excluída por ${req.user.name}.`,
      expenseId,
      name: existing.name
    });

    return res.json({ message: 'Despesa excluída com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir despesa.' });
  }
});

module.exports = router;
