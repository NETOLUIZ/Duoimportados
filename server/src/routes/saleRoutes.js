const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { saleSchema, saleEditSchema } = require('../utils/validationSchemas');
const { parseToCents, centsToDecimalString, splitInstallments } = require('../utils/financialMath');
const { logSecurityEvent } = require('../utils/logger');
const { logAudit } = require('../utils/auditLogger');

router.use(verifyAuth);
router.use(sanitizeBody);

// GET /api/sales - List sales with customer details and paid balance
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const sales = await query(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone,
        COALESCE(
          (SELECT SUM(p.amount_paid) FROM payments p
           JOIN installments i2 ON i2.id = p.installment_id
           WHERE i2.sale_id = s.id AND p.owner_id = s.owner_id),
          0
        ) as total_paid,
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
    await logAudit(req, 'VENDA_CRIADA', {
      message: `Venda #${saleId} ("${product_name}") criada no valor de R$ ${totalValDecimal} em ${installment_count}x.`,
      saleId,
      productName: product_name,
      totalValue: totalValDecimal
    });

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

// PUT /api/sales/:id - Edit Sale
router.put('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const saleId = parseInt(req.params.id);

    if (isNaN(saleId)) return res.status(400).json({ error: 'ID de venda inválido.' });

    const existing = await queryOne('SELECT * FROM sales WHERE id = ? AND owner_id = ?', [saleId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_SALE_EDIT', { userId: req.user.userId, saleId, ip: req.ip });
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    const parseResult = saleEditSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados de venda inválidos.' });
    }

    const { product_name, product_value, interest_percent, late_fee_percent_per_day, sale_date, first_due_date } = parseResult.data;
    const interestPercentDecimal = parseFloat(interest_percent || 0).toFixed(2);
    const lateFeeRateDecimal = parseFloat(late_fee_percent_per_day || 1.0).toFixed(2);

    const newProductValCents = parseToCents(product_value);
    if (newProductValCents <= 0) {
      return res.status(400).json({ error: 'O valor do produto deve ser maior que zero.' });
    }

    const existingProductValCents = parseToCents(existing.product_value);
    // Postgres returns DATE columns as JS Date objects (SQLite returns plain
    // strings) — String(dateObject) produces a full "Wed Sep 13 2026 00:00:00
    // GMT+..." toString(), which never equals the "YYYY-MM-DD" from the
    // request body. That always made this look "changed" and forced an
    // installment regeneration on every single edit, even ones that only
    // touched product_name or interest_percent.
    const existingFirstDueStr = existing.first_due_date
      ? (existing.first_due_date instanceof Date
          ? existing.first_due_date.toISOString().split('T')[0]
          : String(existing.first_due_date).split('T')[0])
      : null;
    const valueOrDateChanged = newProductValCents !== existingProductValCents || existingFirstDueStr !== first_due_date;

    if (!valueOrDateChanged) {
      // Nothing that would require regenerating installments changed — lightweight update
      await query(
        `UPDATE sales SET product_name = ?, interest_percent = ?, late_fee_percent_per_day = ?, sale_date = ?
         WHERE id = ? AND owner_id = ?`,
        [product_name, interestPercentDecimal, lateFeeRateDecimal, sale_date, saleId, ownerId]
      );

      logSecurityEvent('SALE_UPDATED', { ownerId, saleId, ip: req.ip });
      await logAudit(req, 'VENDA_EDITADA', {
        message: `Venda #${saleId} editada por ${req.user.name}.`,
        saleId,
        before: {
          productName: existing.product_name,
          interestPercent: existing.interest_percent,
          lateFeePercentPerDay: existing.late_fee_percent_per_day,
          saleDate: existing.sale_date
        },
        after: {
          productName: product_name,
          interestPercent: interestPercentDecimal,
          lateFeePercentPerDay: lateFeeRateDecimal,
          saleDate: sale_date
        }
      });

      return res.json({ message: 'Venda atualizada com sucesso!' });
    }

    // Value or first due date changed — installments get regenerated. Deleting
    // them cascades and deletes any payments already tied to them, so before
    // that happens we snapshot what existed into the audit trail — the record
    // stays discoverable in Auditoria even though the rows themselves are gone.
    const existingPayments = await query(
      `SELECT p.amount_paid, p.payment_type, p.payment_date FROM payments p
       JOIN installments i ON i.id = p.installment_id
       WHERE i.sale_id = ? AND p.owner_id = ?
       ORDER BY p.id ASC`,
      [saleId, ownerId]
    );
    const existingPaymentsTotal = existingPayments.reduce((acc, p) => acc + parseToCents(p.amount_paid), 0);

    const newInterestValCents = Math.round(newProductValCents * (parseFloat(interest_percent || 0) / 100));
    const newTotalValCents = newProductValCents + newInterestValCents;

    const productValDecimal = centsToDecimalString(newProductValCents);
    const interestValDecimal = centsToDecimalString(newInterestValCents);
    const totalValDecimal = centsToDecimalString(newTotalValCents);

    await query(
      `UPDATE sales SET
        product_name = ?, product_value = ?, interest_value = ?, total_value = ?,
        interest_percent = ?, late_fee_percent_per_day = ?, sale_date = ?, first_due_date = ?
       WHERE id = ? AND owner_id = ?`,
      [product_name, productValDecimal, interestValDecimal, totalValDecimal, interestPercentDecimal, lateFeeRateDecimal, sale_date, first_due_date, saleId, ownerId]
    );

    await query('DELETE FROM installments WHERE sale_id = ? AND owner_id = ?', [saleId, ownerId]);

    const generatedInstallments = splitInstallments(newTotalValCents, existing.installment_count, first_due_date, existing.payment_mode);
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
        [ownerId, saleId, existing.customer_id, inst.installment_number, inst.amount_decimal, inst.due_date, initialStatus, '0.00']
      );
    }

    const wipedPaymentsNote = existingPayments.length > 0
      ? ` ATENÇÃO: ${existingPayments.length} pagamento(s) somando R$ ${centsToDecimalString(existingPaymentsTotal)} que estavam ligados às parcelas antigas desta venda foram removidos junto (parcelas foram recriadas do zero).`
      : '';

    logSecurityEvent('SALE_UPDATED_REGENERATED', { ownerId, saleId, wipedPaymentsCents: existingPaymentsTotal, ip: req.ip });
    await logAudit(req, 'VENDA_EDITADA', {
      message: `Venda #${saleId} editada por ${req.user.name} (valor/data alterados — parcelas regeneradas).${wipedPaymentsNote}`,
      saleId,
      before: { productValue: existing.product_value, firstDueDate: existingFirstDueStr, totalValue: existing.total_value, payments: existingPayments },
      after: { productValue: productValDecimal, firstDueDate: first_due_date, totalValue: totalValDecimal }
    });

    return res.json({ message: 'Venda atualizada e parcelas regeneradas com sucesso!' });
  } catch (err) {
    console.error('Error updating sale:', err);
    return res.status(500).json({ error: 'Erro ao atualizar venda.' });
  }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const saleId = parseInt(req.params.id);

    if (isNaN(saleId)) return res.status(400).json({ error: 'ID inválido.' });

    const existing = await queryOne('SELECT id, product_name, total_value FROM sales WHERE id = ? AND owner_id = ?', [saleId, ownerId]);
    if (!existing) {
      logSecurityEvent('UNAUTHORIZED_IDOR_SALE_DELETE', { userId: req.user.userId, saleId, ip: req.ip });
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    await query('DELETE FROM sales WHERE id = ? AND owner_id = ?', [saleId, ownerId]);
    logSecurityEvent('SALE_DELETED', { ownerId, saleId, ip: req.ip });
    await logAudit(req, 'VENDA_EXCLUIDA', {
      message: `Venda #${saleId} ("${existing.product_name}") no valor de R$ ${existing.total_value} foi excluída por ${req.user.name}.`,
      saleId,
      productName: existing.product_name
    });

    return res.json({ message: 'Venda e parcelas excluídas com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir venda.' });
  }
});

module.exports = router;
