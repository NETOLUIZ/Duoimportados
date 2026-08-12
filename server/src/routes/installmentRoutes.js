const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { paymentSchema } = require('../utils/validationSchemas');
const { parseToCents, centsToDecimalString, calculateDailyLateFee } = require('../utils/financialMath');
const { logSecurityEvent } = require('../utils/logger');

router.use(verifyAuth);
router.use(sanitizeBody);

// GET /api/installments - List installments with filters & dynamic status calculation
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const { status, customer_id, search, limit } = req.query;

    const todayStr = new Date().toISOString().split('T')[0];
    const dateIn2Days = new Date();
    dateIn2Days.setUTCDate(dateIn2Days.getUTCDate() + 2);
    const in2DaysStr = dateIn2Days.toISOString().split('T')[0];

    let sql = `
      SELECT i.*, 
        c.name as customer_name, c.phone as customer_phone,
        s.product_name, s.payment_mode, s.installment_count, s.late_fee_percent_per_day
      FROM installments i
      JOIN customers c ON c.id = i.customer_id
      JOIN sales s ON s.id = i.sale_id
      WHERE i.owner_id = ?
    `;

    const params = [ownerId];

    if (customer_id) {
      const cId = parseInt(customer_id);
      if (!isNaN(cId)) {
        sql += ` AND i.customer_id = ?`;
        params.push(cId);
      }
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      sql += ` AND (c.name LIKE ? OR s.product_name LIKE ? OR c.phone LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status === 'ATRASADA') {
      sql += ` AND i.status != 'PAGA' AND i.due_date < ?`;
      params.push(todayStr);
    } else if (status === 'VENCENDO') {
      sql += ` AND i.status != 'PAGA' AND i.due_date >= ? AND i.due_date <= ?`;
      params.push(todayStr, in2DaysStr);
    } else if (status === 'PAGA') {
      sql += ` AND i.status = 'PAGA'`;
    } else if (status === 'PENDENTE') {
      sql += ` AND i.status = 'PENDENTE' AND i.due_date > ?`;
      params.push(in2DaysStr);
    }

    sql += ` ORDER BY 
      CASE WHEN i.status = 'ATRASADA' THEN 1 WHEN i.status = 'VENCENDO' THEN 2 ELSE 3 END,
      i.due_date ASC`;

    if (limit) {
      const lim = parseInt(limit);
      if (!isNaN(lim) && lim > 0) {
        sql += ` LIMIT ?`;
        params.push(lim);
      }
    }

    const rows = await query(sql, params);

    // Dynamic status and daily late fee adjustment for display accuracy
    const installments = rows.map(inst => {
      let computedStatus = inst.status;
      if (inst.status !== 'PAGA') {
        if (inst.due_date < todayStr) {
          computedStatus = 'ATRASADA';
        } else if (inst.due_date >= todayStr && inst.due_date <= in2DaysStr) {
          computedStatus = 'VENCENDO';
        } else {
          computedStatus = 'PENDENTE';
        }
      }

      const lateFeeRate = parseFloat(inst.late_fee_percent_per_day || 1.0);
      const amountCents = parseToCents(inst.amount);
      const lateFeeCalc = calculateDailyLateFee(amountCents, inst.due_date, todayStr, lateFeeRate);

      return {
        ...inst,
        status: computedStatus,
        days_late: lateFeeCalc.daysLate,
        late_fee_percent_per_day: lateFeeRate,
        late_fee_amount: centsToDecimalString(lateFeeCalc.lateFeeCents),
        updated_amount: centsToDecimalString(lateFeeCalc.updatedTotalCents)
      };
    });

    return res.json(installments);
  } catch (err) {
    console.error('Error fetching installments:', err);
    return res.status(500).json({ error: 'Erro ao listar parcelas.' });
  }
});

// POST /api/installments/:id/payment - Register Payment ("REGISTRAR PAGAMENTO")
router.post('/:id/payment', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const installmentId = parseInt(req.params.id);

    if (isNaN(installmentId)) {
      return res.status(400).json({ error: 'ID de parcela inválido.' });
    }

    const parseResult = paymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados de pagamento inválidos.' });
    }

    const { amount_paid, payment_date, notes } = parseResult.data;

    // Strict IDOR Check: Ensure installment belongs strictly to req.ownerId
    const installment = await queryOne(
      `SELECT i.*, c.name as customer_name, s.product_name
       FROM installments i
       JOIN customers c ON c.id = i.customer_id
       JOIN sales s ON s.id = i.sale_id
       WHERE i.id = ? AND i.owner_id = ?`,
      [installmentId, ownerId]
    );

    if (!installment) {
      logSecurityEvent('UNAUTHORIZED_IDOR_PAYMENT_ATTEMPT', { userId: req.user.userId, installmentId, ip: req.ip });
      return res.status(404).json({ error: 'Parcela não encontrada ou não pertencente à sua conta.' });
    }

    // Server-side Financial Cents Recalculation
    const previousPaidCents = parseToCents(installment.amount_paid);
    const currentPaymentCents = parseToCents(amount_paid);

    if (currentPaymentCents <= 0) {
      return res.status(400).json({ error: 'Informe um valor de pagamento válido.' });
    }

    const newTotalPaidCents = previousPaidCents + currentPaymentCents;
    const currentPaymentDecimal = centsToDecimalString(currentPaymentCents);
    const newTotalPaidDecimal = centsToDecimalString(newTotalPaidCents);

    const installmentAmountCents = parseToCents(installment.amount);
    let newStatus = 'PENDENTE';

    if (newTotalPaidCents >= installmentAmountCents) {
      newStatus = 'PAGA';
    } else if (newTotalPaidCents > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      newStatus = installment.due_date < todayStr ? 'ATRASADA' : 'PENDENTE';
    }

    const paymentDateStr = payment_date || new Date().toISOString().split('T')[0];

    // Insert Payment Record
    await query(
      `INSERT INTO payments 
       (owner_id, installment_id, customer_id, amount_paid, payment_date, registered_by_user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        installmentId,
        installment.customer_id,
        currentPaymentDecimal,
        paymentDateStr,
        req.user.userId,
        notes || 'Pagamento registrado'
      ]
    );

    // Update Installment
    await query(
      `UPDATE installments SET
        amount_paid = ?,
        status = ?,
        paid_at = ?
       WHERE id = ? AND owner_id = ?`,
      [
        newTotalPaidDecimal,
        newStatus,
        newStatus === 'PAGA' ? paymentDateStr : installment.paid_at,
        installmentId,
        ownerId
      ]
    );

    logSecurityEvent('PAYMENT_CONFIRMED', {
      ownerId,
      installmentId,
      amountPaid: currentPaymentDecimal,
      status: newStatus,
      ip: req.ip
    });

    return res.json({
      message: 'Pagamento registrado com sucesso!',
      installment_id: installmentId,
      status: newStatus,
      amount_paid: currentPaymentDecimal,
      total_paid: newTotalPaidDecimal
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    return res.status(500).json({ error: 'Erro ao registrar pagamento.' });
  }
});

module.exports = router;
