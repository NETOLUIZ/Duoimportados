const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { saleSchema } = require('../utils/validationSchemas');
const { parseToCents, centsToDecimalString, splitInstallments } = require('../utils/financialMath');
const { logSecurityEvent } = require('../utils/logger');

router.use(verifyAuth);
router.use(sanitizeBody);

// GET /api/sales - List sales with customer details and paid balance
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const sales = await query(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone,
        COALESCE(SUM(i.amount_paid), 0) as total_paid,
        (s.total_value - COALESCE(SUM(i.amount_paid), 0)) as remaining_balance,
        COUNT(i.id) as total_installments,
        SUM(CASE WHEN i.status = 'PAGA' THEN 1 ELSE 0 END) as paid_installments
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
       LEFT JOIN installments i ON i.sale_id = s.id
       WHERE s.owner_id = ?
       GROUP BY s.id, c.name, c.phone
       ORDER BY s.sale_date DESC, s.id DESC`,
      [ownerId]
    );

    return res.json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    return res.status(500).json({ error: 'Erro ao listar vendas.' });
  }
});

// GET /api/sales/:id - Sale details with installments
router.get('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const saleId = parseInt(req.params.id);

    if (isNaN(saleId)) return res.status(400).json({ error: 'ID de venda inválido.' });

    const sale = await queryOne(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone, c.address, c.number, c.city
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ? AND s.owner_id = ?`,
      [saleId, ownerId]
    );

    if (!sale) {
      logSecurityEvent('UNAUTHORIZED_IDOR_SALE_ACCESS', { userId: req.user.userId, saleId, ip: req.ip });
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    const installments = await query(
      `SELECT * FROM installments WHERE sale_id = ? AND owner_id = ? ORDER BY installment_number ASC`,
      [saleId, ownerId]
    );

    return res.json({
      sale,
      installments
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar detalhes da venda.' });
  }
});

// POST /api/sales - Register New Sale ("+ NOVA VENDA")
router.post('/', async (req, res) => {
  try {
    const parseResult = saleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados de venda inválidos.' });
    }

    const ownerId = req.ownerId;
    const {
      customer_id,
      product_name,
      product_value,
      interest_value,
      interest_percent,
      late_fee_percent_per_day,
      payment_mode,
      installment_count,
      first_due_date,
      sale_date
    } = parseResult.data;

    // Verify Customer belongs strictly to ownerId
    const customer = await queryOne('SELECT id FROM customers WHERE id = ? AND owner_id = ?', [customer_id, ownerId]);
    if (!customer) {
      logSecurityEvent('UNAUTHORIZED_IDOR_SALE_CREATE_CUSTOMER', { userId: req.user.userId, customer_id, ip: req.ip });
      return res.status(400).json({ error: 'Cliente inválido ou não pertencente à sua conta.' });
    }

    // 100% Server-side Financial recalculation in integer cents
    const productValCents = parseToCents(product_value);
    const interestValCents = parseToCents(interest_value || 0);
    const totalValCents = productValCents + interestValCents;

    if (productValCents <= 0) {
      return res.status(400).json({ error: 'O valor do produto deve ser maior que zero.' });
    }

    const productValDecimal = centsToDecimalString(productValCents);
    const interestValDecimal = centsToDecimalString(interestValCents);
    const totalValDecimal = centsToDecimalString(totalValCents);

    const saleDateStr = sale_date || new Date().toISOString().split('T')[0];
    const lateFeeRateDecimal = parseFloat(late_fee_percent_per_day || 1.0).toFixed(2);
    const interestPercentDecimal = parseFloat(interest_percent || 0).toFixed(2);

    // Insert Sale Record
    const saleResult = await query(
      `INSERT INTO sales
       (owner_id, customer_id, product_name, sale_date, product_value, interest_value, interest_percent, total_value, payment_mode, installment_count, first_due_date, late_fee_percent_per_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        customer_id,
        product_name,
        saleDateStr,
        productValDecimal,
        interestValDecimal,
        interestPercentDecimal,
        totalValDecimal,
        payment_mode,
        installment_count,
        first_due_date,
        lateFeeRateDecimal
      ]
    );

    const saleId = saleResult[0]?.id;

    // Server-side generate N Installments automatically with exact remainder allocation
    const generatedInstallments = splitInstallments(totalValCents, installment_count, first_due_date, payment_mode);
    const todayStr = new Date().toISOString().split('T')[0];

    for (const inst of generatedInstallments) {
      let initialStatus = 'PENDENTE';
      if (inst.due_date < todayStr) {
        initialStatus = 'ATRASADA';
      }

      await query(
        `INSERT INTO installments
         (owner_id, sale_id, customer_id, installment_number, amount, due_date, status, amount_paid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          saleId,
          customer_id,
          inst.installment_number,
          inst.amount_decimal,
          inst.due_date,
          initialStatus,
          '0.00'
        ]
      );
    }

    logSecurityEvent('SALE_CREATED', { ownerId, saleId, totalValue: totalValDecimal, count: installment_count, ip: req.ip });

    return res.status(201).json({
      message: 'Venda registrada e parcelas geradas com sucesso!',
      sale_id: saleId,
      total_value: totalValDecimal,
      installments_count: installment_count
    });
  } catch (err) {
    console.error('Error creating sale:', err);
    return res.status(500).json({ error: 'Erro ao registrar venda.' });
  }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const saleId = parseInt(req.params.id);

    if (isNaN(saleId)) return res.status(400).json({ error: 'ID inválido.' });

    const existing = await queryOne('SELECT id FROM sales WHERE id = ? AND owner_id = ?', [saleId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_SALE_DELETE', { userId: req.user.userId, saleId, ip: req.ip });
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    await query('DELETE FROM sales WHERE id = ? AND owner_id = ?', [saleId, ownerId]);
    logSecurityEvent('SALE_DELETED', { ownerId, saleId, ip: req.ip });

    return res.json({ message: 'Venda e parcelas excluídas com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir venda.' });
  }
});

module.exports = router;
