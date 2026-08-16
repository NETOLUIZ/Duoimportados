const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { paymentSchema } = require('../utils/validationSchemas');
const { parseToCents, centsToDecimalString, calculateDailyLateFee, calculateDueDate, parseLocalDate } = require('../utils/financialMath');
const { logSecurityEvent } = require('../utils/logger');
const { logAudit } = require('../utils/auditLogger');

router.use(verifyAuth);
router.use(sanitizeBody);

// GET /api/installments - List installments with filters & dynamic status calculation
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const { status, customer_id, search, limit, payment_mode } = req.query;

    const todayStr = new Date().toISOString().split('T')[0];
    const dateIn2Days = new Date();
    dateIn2Days.setUTCDate(dateIn2Days.getUTCDate() + 2);
    const in2DaysStr = dateIn2Days.toISOString().split('T')[0];

    let sql = `
      SELECT i.*,
        c.name as customer_name, c.phone as customer_phone,
        s.product_name, s.payment_mode, s.installment_count, s.late_fee_percent_per_day, s.interest_percent, s.product_value
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
      // LOWER() on both sides — Postgres' LIKE is case-sensitive (unlike SQLite's).
      sql += ` AND (LOWER(c.name) LIKE ? OR LOWER(s.product_name) LIKE ? OR LOWER(c.phone) LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }

    if (['DIARIA', 'QUINZENAL', 'MENSAL'].includes(payment_mode)) {
      sql += ` AND s.payment_mode = ?`;
      params.push(payment_mode);
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

      // "?? 0", not "|| 1.0" — a deliberately-set 0% (no late fee) is falsy
      // and would otherwise get silently overridden back to 1%/day.
      const lateFeeRate = parseFloat(inst.late_fee_percent_per_day ?? 0);
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

    const { amount_paid, payment_date, payment_type, notes } = parseResult.data;

    // Strict IDOR Check: Ensure installment belongs strictly to req.ownerId
    const installment = await queryOne(
      `SELECT i.*, c.name as customer_name, s.product_name, s.payment_mode, s.interest_percent, s.product_value, s.installment_count, s.late_fee_percent_per_day
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

    const paymentDateStr = payment_date || new Date().toISOString().split('T')[0];

    if (payment_type === 'INTEREST_ONLY') {
      // Renewal payment: charge the interest on THIS installment's share of the
      // original principal (product_value / installment_count) — NOT on i.amount,
      // which already has the sale's one-time interest baked in and would double-count it.
      // If the installment is overdue, also add the daily late fee accrued up to the
      // payment date (juros do mês + juros do dia), same base as the monthly interest.
      // Push the due date forward by one period, leaving the principal owed as-is.
      const principalShareCents = installment.installment_count > 0
        ? Math.round(parseToCents(installment.product_value) / installment.installment_count)
        : parseToCents(installment.product_value);
      const interestRate = parseFloat(installment.interest_percent || 0);
      const monthlyInterestCents = Math.round(principalShareCents * (interestRate / 100));

      const lateFeeRate = parseFloat(installment.late_fee_percent_per_day ?? 0);
      const { daysLate, lateFeeCents } = calculateDailyLateFee(principalShareCents, installment.due_date, paymentDateStr, lateFeeRate);

      const interestCents = monthlyInterestCents + lateFeeCents;

      if (interestCents <= 0) {
        return res.status(400).json({ error: 'Esta venda não possui percentual de juros configurado para renovação.' });
      }

      const interestDecimal = centsToDecimalString(interestCents);
      const monthlyInterestDecimal = centsToDecimalString(monthlyInterestCents);
      const lateFeeDecimal = centsToDecimalString(lateFeeCents);
      const currentDueDate = parseLocalDate(installment.due_date);
      const newDueDate = calculateDueDate(currentDueDate, 1, installment.payment_mode);

      const breakdownNote = daysLate > 0
        ? `Pagamento de juros (${interestRate}% = R$ ${monthlyInterestDecimal} + ${daysLate} dia(s) de atraso a ${lateFeeRate}%/dia = R$ ${lateFeeDecimal}) — parcela renovada para ${newDueDate}`
        : `Pagamento somente dos juros (${interestRate}%) — parcela renovada para ${newDueDate}`;

      await query(
        `INSERT INTO payments
         (owner_id, installment_id, customer_id, amount_paid, payment_date, payment_type, registered_by_user_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          installmentId,
          installment.customer_id,
          interestDecimal,
          paymentDateStr,
          'INTEREST_ONLY',
          req.user.userId,
          notes || breakdownNote
        ]
      );

      await query(
        `UPDATE installments SET due_date = ?, status = 'PENDENTE' WHERE id = ? AND owner_id = ?`,
        [newDueDate, installmentId, ownerId]
      );

      logSecurityEvent('INSTALLMENT_RENEWED_INTEREST_ONLY', {
        ownerId,
        installmentId,
        interestPaid: interestDecimal,
        monthlyInterest: monthlyInterestDecimal,
        lateFee: lateFeeDecimal,
        daysLate,
        previousDueDate: installment.due_date,
        newDueDate,
        ip: req.ip
      });

      await logAudit(req, 'PAGAMENTO_JUROS', {
        message: `Pagamento de juros de R$ ${interestDecimal} no cliente "${installment.customer_name}" (Parcela #${installment.installment_number})${daysLate > 0 ? ` [juro do mês R$ ${monthlyInterestDecimal} + atraso ${daysLate}d R$ ${lateFeeDecimal}]` : ''}. Parcela renovada para ${newDueDate}.`,
        installmentId,
        customerName: installment.customer_name,
        amountPaid: interestDecimal
      });

      return res.json({
        message: daysLate > 0
          ? `Juros pago (R$ ${monthlyInterestDecimal} + R$ ${lateFeeDecimal} de atraso)! Parcela renovada para ${newDueDate}.`
          : `Juros pago! Parcela renovada para ${newDueDate}.`,
        installment_id: installmentId,
        status: 'PENDENTE',
        amount_paid: interestDecimal,
        monthly_interest: monthlyInterestDecimal,
        late_fee: lateFeeDecimal,
        days_late: daysLate,
        new_due_date: newDueDate
      });
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

    // Insert Payment Record
    await query(
      `INSERT INTO payments
       (owner_id, installment_id, customer_id, amount_paid, payment_date, payment_type, registered_by_user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        installmentId,
        installment.customer_id,
        currentPaymentDecimal,
        paymentDateStr,
        'FULL',
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

    await logAudit(req, 'PAGAMENTO_REGISTRADO', {
      message: `Pagamento de R$ ${currentPaymentDecimal} registrado no cliente "${installment.customer_name}" (Parcela #${installment.installment_number} - ${installment.product_name}). Status: ${newStatus}.`,
      installmentId,
      customerName: installment.customer_name,
      amountPaid: currentPaymentDecimal,
      status: newStatus
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
