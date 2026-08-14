const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { sanitizeBody } = require('../middleware/securityMiddleware');
const { referrerConfigSchema } = require('../utils/validationSchemas');
const { parseToCents, centsToDecimalString } = require('../utils/financialMath');
const { logSecurityEvent } = require('../utils/logger');

const REFERRAL_EXPENSE_CATEGORY = 'Comissão de Indicação';

router.use(verifyAuth);
router.use(sanitizeBody);

function currentPeriod() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function resolvePeriod(raw) {
  return /^\d{4}-\d{2}$/.test(raw || '') ? raw : currentPeriod();
}

function computeCommissionCents(referrer, baseAmountCents) {
  if (referrer.commission_type === 'PERCENTAGE') {
    const rate = parseFloat(referrer.commission_value) || 0;
    return Math.round(baseAmountCents * (rate / 100));
  }
  return parseToCents(referrer.commission_value);
}

// GET /api/referrals?period=YYYY-MM - List referrers with stats for the given month
router.get('/', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const period = resolvePeriod(req.query.period);

    const nameRows = await query(
      `SELECT DISTINCT TRIM(referred_by) as name FROM customers
       WHERE owner_id = ? AND referred_by IS NOT NULL AND TRIM(referred_by) != ''`,
      [ownerId]
    );

    const configRows = await query(`SELECT * FROM referrers WHERE owner_id = ?`, [ownerId]);
    const configByKey = {};
    configRows.forEach((r) => { configByKey[r.name.trim().toLowerCase()] = r; });

    const namesByKey = {};
    nameRows.forEach((r) => { if (r.name) namesByKey[r.name.trim().toLowerCase()] = r.name.trim(); });
    configRows.forEach((r) => { namesByKey[r.name.trim().toLowerCase()] = r.name.trim(); });

    const referrers = [];
    for (const key of Object.keys(namesByKey)) {
      const name = namesByKey[key];
      const config = configByKey[key] || null;

      const statsRow = await queryOne(
        `SELECT COALESCE(SUM(s.interest_value), 0) as base_amount
         FROM customers c
         JOIN sales s ON s.customer_id = c.id AND s.owner_id = c.owner_id
         WHERE c.owner_id = ? AND LOWER(TRIM(c.referred_by)) = ? AND CAST(s.sale_date AS TEXT) LIKE ?`,
        [ownerId, key, `${period}%`]
      );

      const referredCustomers = await query(
        `SELECT id, name FROM customers WHERE owner_id = ? AND LOWER(TRIM(referred_by)) = ? ORDER BY name ASC`,
        [ownerId, key]
      );

      const baseAmountCents = parseToCents(statsRow?.base_amount || 0);
      const commissionCents = config ? computeCommissionCents(config, baseAmountCents) : 0;

      let payment = null;
      if (config) {
        payment = await queryOne(
          `SELECT * FROM referral_payments WHERE referrer_id = ? AND period = ?`,
          [config.id, period]
        );
      }

      referrers.push({
        referrer_id: config?.id || null,
        name,
        commission_type: config?.commission_type || null,
        commission_value: config?.commission_value ?? null,
        customers: referredCustomers,
        customers_count: referredCustomers.length,
        base_amount: centsToDecimalString(baseAmountCents),
        commission_amount: centsToDecimalString(commissionCents),
        is_paid: !!payment,
        paid_amount: payment?.amount_paid ?? null,
        paid_at: payment?.paid_at ?? null
      });
    }

    referrers.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return res.json({ period, referrers });
  } catch (err) {
    console.error('Error fetching referrals:', err);
    return res.status(500).json({ error: 'Erro ao buscar indicações.' });
  }
});

// PUT /api/referrals/config - Create or update a referrer's commission rule
router.put('/config', async (req, res) => {
  try {
    const parseResult = referrerConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Dados inválidos.' });
    }

    const ownerId = req.ownerId;
    const { name, commission_type, commission_value } = parseResult.data;
    const key = name.toLowerCase();

    const existing = await queryOne(
      `SELECT * FROM referrers WHERE owner_id = ? AND LOWER(TRIM(name)) = ?`,
      [ownerId, key]
    );

    if (existing) {
      await query(
        `UPDATE referrers SET commission_type = ?, commission_value = ? WHERE id = ? AND owner_id = ?`,
        [commission_type, commission_value, existing.id, ownerId]
      );
      logSecurityEvent('REFERRAL_CONFIG_UPDATED', {
        ownerId,
        referrerId: existing.id,
        editedBy: req.user.userId,
        before: { commission_type: existing.commission_type, commission_value: existing.commission_value },
        after: { commission_type, commission_value },
        ip: req.ip
      });
      return res.json({ message: 'Comissão de indicação atualizada!', id: existing.id });
    }

    const result = await query(
      `INSERT INTO referrers (owner_id, name, commission_type, commission_value) VALUES (?, ?, ?, ?)`,
      [ownerId, name, commission_type, commission_value]
    );

    logSecurityEvent('REFERRAL_CONFIG_CREATED', {
      ownerId,
      referrerId: result[0]?.id,
      name,
      commission_type,
      commission_value,
      ip: req.ip
    });

    return res.status(201).json({ message: 'Indicador configurado com sucesso!', id: result[0]?.id });
  } catch (err) {
    console.error('Error saving referrer config:', err);
    return res.status(500).json({ error: 'Erro ao salvar configuração de indicação.' });
  }
});

// POST /api/referrals/:id/pay - Pay a referrer's commission for a period, logging it as an expense
router.post('/:id/pay', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const referrerId = parseInt(req.params.id);
    if (isNaN(referrerId)) return res.status(400).json({ error: 'Indicador inválido.' });

    const period = resolvePeriod(req.body?.period);

    const referrer = await queryOne('SELECT * FROM referrers WHERE id = ? AND owner_id = ?', [referrerId, ownerId]);
    if (!referrer) {
      logSecurityEvent('UNAUTHORIZED_IDOR_REFERRAL_PAY', { userId: req.user.userId, referrerId, ip: req.ip });
      return res.status(404).json({ error: 'Indicador não encontrado.' });
    }

    const alreadyPaid = await queryOne(
      'SELECT id FROM referral_payments WHERE referrer_id = ? AND period = ?',
      [referrerId, period]
    );
    if (alreadyPaid) {
      return res.status(400).json({ error: `A comissão de ${period} já foi paga para este indicador.` });
    }

    const key = referrer.name.trim().toLowerCase();
    const statsRow = await queryOne(
      `SELECT COALESCE(SUM(s.interest_value), 0) as base_amount
       FROM customers c
       JOIN sales s ON s.customer_id = c.id AND s.owner_id = c.owner_id
       WHERE c.owner_id = ? AND LOWER(TRIM(c.referred_by)) = ? AND CAST(s.sale_date AS TEXT) LIKE ?`,
      [ownerId, key, `${period}%`]
    );
    const baseAmountCents = parseToCents(statsRow?.base_amount || 0);
    const commissionCents = computeCommissionCents(referrer, baseAmountCents);

    if (commissionCents <= 0) {
      return res.status(400).json({ error: 'Não há comissão a pagar para este indicador neste período.' });
    }

    const commissionDecimal = centsToDecimalString(commissionCents);
    const todayStr = new Date().toISOString().split('T')[0];

    // Ensure the expense category exists for this seller (nicety for the Expenses filter list)
    const existingCategory = await queryOne(
      'SELECT id FROM expense_categories WHERE owner_id = ? AND name = ?',
      [ownerId, REFERRAL_EXPENSE_CATEGORY]
    );
    if (!existingCategory) {
      await query('INSERT INTO expense_categories (owner_id, name) VALUES (?, ?)', [ownerId, REFERRAL_EXPENSE_CATEGORY]);
    }

    const expenseResult = await query(
      `INSERT INTO expenses (owner_id, category_name, name, amount, expense_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        REFERRAL_EXPENSE_CATEGORY,
        `Comissão de indicação - ${referrer.name}`,
        commissionDecimal,
        todayStr,
        `Referente ao período ${period}`
      ]
    );
    const expenseId = expenseResult[0]?.id;

    await query(
      `INSERT INTO referral_payments (owner_id, referrer_id, period, base_amount, amount_paid, expense_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerId, referrerId, period, centsToDecimalString(baseAmountCents), commissionDecimal, expenseId]
    );

    logSecurityEvent('REFERRAL_COMMISSION_PAID', { ownerId, referrerId, period, amount: commissionDecimal, ip: req.ip });

    return res.json({
      message: 'Comissão paga e registrada em Despesas!',
      amount_paid: commissionDecimal,
      expense_id: expenseId
    });
  } catch (err) {
    console.error('Error paying referral commission:', err);
    return res.status(500).json({ error: 'Erro ao pagar comissão de indicação.' });
  }
});

module.exports = router;
