const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database');
const { verifyAuth } = require('../middleware/authMiddleware');
const { parseToCents, centsToDecimalString } = require('../utils/financialMath');

router.use(verifyAuth);

// Helper to determine start and end dates based on period string
function getDateRange(period, customStart, customEnd) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  const todayStr = now.toISOString().split('T')[0];

  if (period === 'hoje') {
    return { startDate: todayStr, endDate: todayStr };
  } else if (period === 'ultimos_7_dias') {
    start.setUTCDate(start.getUTCDate() - 6);
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  } else if (period === 'este_mes') {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, now.getUTCMonth() + 1, 0)).getUTCDate();
    return { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
  } else if (period === 'mes_anterior') {
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const year = prevMonth.getUTCFullYear();
    const month = String(prevMonth.getUTCMonth() + 1).padStart(2, '0');
    const lastDay = new Date(Date.UTC(year, prevMonth.getUTCMonth() + 1, 0)).getUTCDate();
    return { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
  } else if (period === 'ultimos_30_dias') {
    start.setUTCDate(start.getUTCDate() - 29);
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  } else if (period === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }

  // Default: este mês
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, now.getUTCMonth() + 1, 0)).getUTCDate();
  return { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}` };
}

// GET /api/financial/overview
router.get('/overview', async (req, res) => {
  try {
    const ownerId = req.ownerId;
    const { period, startDate: reqStart, endDate: reqEnd } = req.query;

    const { startDate, endDate } = getDateRange(period, reqStart, reqEnd);

    // Sales in period
    const salesRes = await queryOne(
      `SELECT COALESCE(SUM(total_value), 0) as total FROM sales 
       WHERE owner_id = ? AND sale_date >= ? AND sale_date <= ?`,
      [ownerId, startDate, endDate]
    );

    // Payments received in period
    const paymentsRes = await queryOne(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments 
       WHERE owner_id = ? AND payment_date >= ? AND payment_date <= ?`,
      [ownerId, startDate, endDate]
    );

    // Installments to receive (due in period and not paid)
    const toReceiveRes = await queryOne(
      `SELECT COALESCE(SUM(amount - amount_paid), 0) as total FROM installments 
       WHERE owner_id = ? AND status != 'PAGA' AND due_date >= ? AND due_date <= ?`,
      [ownerId, startDate, endDate]
    );

    // Expenses in period
    const expensesRes = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
       WHERE owner_id = ? AND expense_date >= ? AND expense_date <= ?`,
      [ownerId, startDate, endDate]
    );

    // Overdue values total (overall)
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueRes = await queryOne(
      `SELECT COALESCE(SUM(amount - amount_paid), 0) as total FROM installments 
       WHERE owner_id = ? AND status != 'PAGA' AND due_date < ?`,
      [ownerId, todayStr]
    );

    const vendasCents = parseToCents(salesRes?.total);
    const recebidoCents = parseToCents(paymentsRes?.total);
    const aReceberCents = parseToCents(toReceiveRes?.total);
    const despesasCents = parseToCents(expensesRes?.total);
    const atrasadoCents = parseToCents(overdueRes?.total);

    const lucroRealizadoCents = recebidoCents - despesasCents;
    const lucroPrevistoCents = (recebidoCents + aReceberCents) - despesasCents;

    // Build Receitas vs Despesas comparison timeline chart data
    // Fetch daily received vs expenses in date range
    const dailyPayments = await query(
      `SELECT payment_date as date, SUM(amount_paid) as total_recebido
       FROM payments
       WHERE owner_id = ? AND payment_date >= ? AND payment_date <= ?
       GROUP BY payment_date`,
      [ownerId, startDate, endDate]
    );

    const dailyExpenses = await query(
      `SELECT expense_date as date, SUM(amount) as total_despesa
       FROM expenses
       WHERE owner_id = ? AND expense_date >= ? AND expense_date <= ?
       GROUP BY expense_date`,
      [ownerId, startDate, endDate]
    );

    // Map into unified timeline array
    const dateMap = {};

    dailyPayments.forEach(row => {
      if (!dateMap[row.date]) dateMap[row.date] = { date: row.date, recebido: 0, despesa: 0 };
      dateMap[row.date].recebido = parseFloat(row.total_recebido);
    });

    dailyExpenses.forEach(row => {
      if (!dateMap[row.date]) dateMap[row.date] = { date: row.date, recebido: 0, despesa: 0 };
      dateMap[row.date].despesa = parseFloat(row.total_despesa);
    });

    const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      period,
      startDate,
      endDate,
      summary: {
        vendas: centsToDecimalString(vendasCents),
        recebido: centsToDecimalString(recebidoCents),
        a_receber: centsToDecimalString(aReceberCents),
        despesas: centsToDecimalString(despesasCents),
        lucro_realizado: centsToDecimalString(lucroRealizadoCents),
        lucro_previsto: centsToDecimalString(lucroPrevistoCents),
        valores_atrasados: centsToDecimalString(atrasadoCents)
      },
      chartData
    });
  } catch (err) {
    console.error('Error fetching financial overview:', err);
    return res.status(500).json({ error: 'Erro ao carregar dados financeiros.' });
  }
});

module.exports = router;
