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

  if (period === 'todas') {
    return { startDate: '0001-01-01', endDate: '9999-12-31' };
  } else if (period === 'hoje') {
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

    // Sales in period (product_value, interest_value, total_value)
    const salesRes = await queryOne(
      `SELECT 
         COALESCE(SUM(product_value), 0) as total_products,
         COALESCE(SUM(interest_value), 0) as total_interest,
         COALESCE(SUM(total_value), 0) as total 
       FROM sales 
       WHERE owner_id = ? AND CAST(sale_date AS TEXT) >= ? AND CAST(sale_date AS TEXT) <= ?`,
      [ownerId, startDate, endDate]
    );

    // Payments received in period
    const paymentsRes = await queryOne(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments 
       WHERE owner_id = ? AND CAST(payment_date AS TEXT) >= ? AND CAST(payment_date AS TEXT) <= ?`,
      [ownerId, startDate, endDate]
    );

    // Installments to receive TOTAL (all pending balance across all customers)
    const toReceiveRes = await queryOne(
      `SELECT COALESCE(SUM(amount - amount_paid), 0) as total FROM installments 
       WHERE owner_id = ? AND status != 'PAGA'`,
      [ownerId]
    );

    // Expenses in period — filtered strictly by expense_date within the selected date range
    const expensesRes = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE owner_id = ? AND CAST(expense_date AS TEXT) >= ? AND CAST(expense_date AS TEXT) <= ?`,
      [ownerId, startDate, endDate]
    );

    const fixedExpensesRes = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE owner_id = ? AND expense_type = 'FIXA' AND CAST(expense_date AS TEXT) >= ? AND CAST(expense_date AS TEXT) <= ?`,
      [ownerId, startDate, endDate]
    );

    const variableExpensesRes = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE owner_id = ? AND expense_type != 'FIXA' AND CAST(expense_date AS TEXT) >= ? AND CAST(expense_date AS TEXT) <= ?`,
      [ownerId, startDate, endDate]
    );

    // Overdue values total (overall)
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueRes = await queryOne(
      `SELECT COALESCE(SUM(amount - amount_paid), 0) as total FROM installments 
       WHERE owner_id = ? AND status != 'PAGA' AND CAST(due_date AS TEXT) < ?`,
      [ownerId, todayStr]
    );

    const vendasCents = parseToCents(salesRes?.total);
    const vendasProdutosCents = parseToCents(salesRes?.total_products);
    const vendasJurosCents = parseToCents(salesRes?.total_interest);
    
    const recebidoCents = parseToCents(paymentsRes?.total);
    const aReceberCents = parseToCents(toReceiveRes?.total);
    const despesasCents = parseToCents(expensesRes?.total);
    const despesasFixasCents = parseToCents(fixedExpensesRes?.total);
    const despesasVariaveisCents = parseToCents(variableExpensesRes?.total);
    const atrasadoCents = parseToCents(overdueRes?.total);

    const lucroRealizadoCents = recebidoCents - despesasCents;
    // Lucro em juros limpo no período
    const jurosLimposCents = vendasJurosCents;
    // Lucro apurado (Juros Limpos - Despesas)
    const lucroLiquidoApuradoCents = jurosLimposCents - despesasCents;

    // Build Receitas vs Despesas comparison timeline chart data
    // Fetch daily received vs expenses in date range
    const dailyPayments = await query(
      `SELECT CAST(payment_date AS TEXT) as date, SUM(amount_paid) as total_recebido
       FROM payments
       WHERE owner_id = ? AND CAST(payment_date AS TEXT) >= ? AND CAST(payment_date AS TEXT) <= ?
       GROUP BY CAST(payment_date AS TEXT)`,
      [ownerId, startDate, endDate]
    );

    const dailyExpenses = await query(
      `SELECT CAST(expense_date AS TEXT) as date, SUM(amount) as total_despesa
       FROM expenses
       WHERE owner_id = ? AND CAST(expense_date AS TEXT) >= ? AND CAST(expense_date AS TEXT) <= ?
       GROUP BY CAST(expense_date AS TEXT)`,
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
        vendas_produtos: centsToDecimalString(vendasProdutosCents),
        vendas_juros: centsToDecimalString(vendasJurosCents),
        recebido: centsToDecimalString(recebidoCents),
        a_receber: centsToDecimalString(aReceberCents),
        despesas: centsToDecimalString(despesasCents),
        despesas_fixas: centsToDecimalString(despesasFixasCents),
        despesas_variaveis: centsToDecimalString(despesasVariaveisCents),
        lucro_realizado: centsToDecimalString(lucroRealizadoCents),
        juros_limpos: centsToDecimalString(jurosLimposCents),
        lucro_liquido_apurado: centsToDecimalString(lucroLiquidoApuradoCents),
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
