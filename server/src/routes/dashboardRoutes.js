const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { parseToCents, centsToDecimalString } = require('../utils/financialMath');

router.use(verifyAuth);

// GET /api/dashboard/summary - Key cards summary metrics
router.get('/summary', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const todayStr = new Date().toISOString().split('T')[0];

    const dateIn2Days = new Date();
    dateIn2Days.setUTCDate(dateIn2Days.getUTCDate() + 2);
    const in2DaysStr = dateIn2Days.toISOString().split('T')[0];

    // 1. Total Sales
    const salesRes = await queryOne(
      'SELECT COALESCE(SUM(total_value), 0) as total FROM sales WHERE owner_id = ?',
      [ownerId]
    );

    // 2. Total Received — from the payments ledger, not installments.amount_paid,
    // since INTEREST_ONLY payments never touch amount_paid (they only push the due
    // date forward) and would otherwise vanish from this total.
    const receivedRes = await queryOne(
      'SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE owner_id = ?',
      [ownerId]
    );

    // 3. Total To Receive
    const toReceiveRes = await queryOne(
      `SELECT COALESCE(SUM(amount - amount_paid), 0) as total 
       FROM installments 
       WHERE owner_id = ? AND status != 'PAGA'`,
      [ownerId]
    );

    // 4. Total Expenses
    const expensesRes = await queryOne(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE owner_id = ?',
      [ownerId]
    );

    // 5. Active Customers
    const customersRes = await queryOne(
      'SELECT COUNT(DISTINCT id) as total FROM customers WHERE owner_id = ?',
      [ownerId]
    );

    // 6. Overdue installments (🔴)
    const overdueRes = await queryOne(
      `SELECT COUNT(id) as count, COALESCE(SUM(amount - amount_paid), 0) as total
       FROM installments
       WHERE owner_id = ? AND status != 'PAGA' AND due_date < ?`,
      [ownerId, todayStr]
    );

    // 7. Due in 2 days installments (🟡)
    const dueSoonRes = await queryOne(
      `SELECT COUNT(id) as count, COALESCE(SUM(amount - amount_paid), 0) as total
       FROM installments
       WHERE owner_id = ? AND status != 'PAGA' AND due_date >= ? AND due_date <= ?`,
      [ownerId, todayStr, in2DaysStr]
    );

    const totalVendasCents = parseToCents(salesRes?.total);
    const totalRecebidoCents = parseToCents(receivedRes?.total);
    const totalAReceberCents = parseToCents(toReceiveRes?.total);
    const totalDespesasCents = parseToCents(expensesRes?.total);

    // Realized Profit = Total Received - Total Expenses
    const lucroRealizadoCents = totalRecebidoCents - totalDespesasCents;

    return res.json({
      vendas: centsToDecimalString(totalVendasCents),
      recebido: centsToDecimalString(totalRecebidoCents),
      a_receber: centsToDecimalString(totalAReceberCents),
      despesas: centsToDecimalString(totalDespesasCents),
      lucro: centsToDecimalString(lucroRealizadoCents),
      clientes_ativos: parseInt(customersRes?.total || 0),
      atrasados: {
        count: parseInt(overdueRes?.count || 0),
        value: centsToDecimalString(parseToCents(overdueRes?.total))
      },
      vencendo_2_dias: {
        count: parseInt(dueSoonRes?.count || 0),
        value: centsToDecimalString(parseToCents(dueSoonRes?.total))
      }
    });
  } catch (err) {
    console.error('Error computing dashboard summary:', err);
    return res.status(500).json({ error: 'Erro ao carregar resumo do dashboard.' });
  }
});

// GET /api/dashboard/alerts - Central de Alertas ("Precisa da sua atenção")
router.get('/alerts', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const todayStr = new Date().toISOString().split('T')[0];

    const dateIn2Days = new Date();
    dateIn2Days.setUTCDate(dateIn2Days.getUTCDate() + 2);
    const in2DaysStr = dateIn2Days.toISOString().split('T')[0];

    // 🔴 ATRASADOS
    const atrasados = await query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone,
        s.product_name, s.payment_mode, s.installment_count, s.late_fee_percent_per_day, s.interest_percent, s.product_value
       FROM installments i
       JOIN customers c ON c.id = i.customer_id
       JOIN sales s ON s.id = i.sale_id
       WHERE i.owner_id = ? AND i.status != 'PAGA' AND i.due_date < ?
       ORDER BY i.due_date ASC`,
      [ownerId, todayStr]
    );

    // 🟡 PRÓXIMOS DO VENCIMENTO (Vencem nos próximos 2 dias)
    const vencendo = await query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone,
        s.product_name, s.payment_mode, s.installment_count, s.late_fee_percent_per_day, s.interest_percent, s.product_value
       FROM installments i
       JOIN customers c ON c.id = i.customer_id
       JOIN sales s ON s.id = i.sale_id
       WHERE i.owner_id = ? AND i.status != 'PAGA' AND i.due_date >= ? AND i.due_date <= ?
       ORDER BY i.due_date ASC`,
      [ownerId, todayStr, in2DaysStr]
    );

    // 🟢 PAGOS (Últimos pagamentos)
    const recemPagos = await query(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone,
        s.product_name, s.payment_mode, s.installment_count, s.late_fee_percent_per_day, s.interest_percent, s.product_value,
        p.payment_date, p.amount_paid as last_amount_paid
       FROM installments i
       JOIN customers c ON c.id = i.customer_id
       JOIN sales s ON s.id = i.sale_id
       JOIN payments p ON p.installment_id = i.id
       WHERE i.owner_id = ? AND i.status = 'PAGA'
       ORDER BY p.payment_date DESC, p.id DESC
       LIMIT 10`,
      [ownerId]
    );

    return res.json({
      atrasados,
      vencendo,
      recem_pagos: recemPagos
    });
  } catch (err) {
    console.error('Error fetching dashboard alerts:', err);
    return res.status(500).json({ error: 'Erro ao carregar alertas.' });
  }
});

module.exports = router;
