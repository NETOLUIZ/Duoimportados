import React, { useState, useEffect } from 'react';
import { TrendingUp, Filter, ArrowUpCircle, ArrowDownCircle, Table2, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

const PERIODS = [
  { id: 'todas', label: 'Todas as Datas' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'ultimos_7_dias', label: 'Últimos 7 dias' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_anterior', label: 'Mês anterior' },
  { id: 'ultimos_30_dias', label: 'Últimos 30 dias' },
  { id: 'custom', label: 'Personalizado' },
];

// recebido/despesa validated for both CVD-adjacent contrast and surface contrast
// (light: emerald-600/rose-600, dark: emerald-600/rose-500) — color is never the
// only channel: legend icons, tooltip line-keys and axis position back it up too.
const CHART_COLORS = {
  light: { recebido: '#059669', despesa: '#E11D48' },
  dark: { recebido: '#059669', despesa: '#F43F5E' }
};

function ChartTooltip({ active, payload, label, isDark }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={`rounded-xl shadow-lg px-3.5 py-3 text-xs min-w-[170px] border ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
    }`}>
      <p className={`font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatDate(label)}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <span className="w-1 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{formatBRL(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({ colors }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colors.recebido }} />
        <ArrowUpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        Recebimentos (Entradas)
      </span>
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colors.despesa }} />
        <ArrowDownCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        Despesas (Saídas)
      </span>
    </div>
  );
}

export default function FinancialPage() {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState('este_mes'); // hoje, ultimos_7_dias, este_mes, mes_anterior, ultimos_30_dias, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const fetchFinancialOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      const res = await api.get(`/financial/overview?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching financial overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialOverview();
  }, [period]);

  const handleCustomFilterSubmit = (e) => {
    e.preventDefault();
    fetchFinancialOverview();
  };

  const summary = data?.summary;
  const isLucroRealizadoPositive = parseFloat(summary?.lucro_realizado || 0) >= 0;
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const chartColors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-brand-blue" />
            Relatórios Financeiro & DRE
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Comparativo visual de receitas vs despesas e projeção de lucro.</p>
        </div>
      </div>

      {/* Period Filter Buttons */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-brand-blue" />
          Filtrar Período:
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto w-full md:w-auto">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-2 min-h-[36px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                period === p.id ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Form if 'custom' selected */}
      {period === 'custom' && (
        <form onSubmit={handleCustomFilterSubmit} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-end gap-4 text-sm font-medium">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 min-h-[40px] font-semibold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 min-h-[40px] font-semibold text-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-2.5 px-4 min-h-[40px] rounded-xl text-xs shadow-md"
          >
            APLICAR FILTRO
          </button>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Carregando relatório financeiro...</div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {/* Key Metric Grid */}
          {/* Key Metric Grid - Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">qnto foi investido</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{formatBRL(summary?.vendas_produtos || summary?.vendas)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Valor dos produtos vendidos</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-purple-100 dark:border-purple-500/20 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">so os juros <span className="text-[10px] opacity-80">(limpos)</span></p>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{formatBRL(summary?.juros_limpos)}</p>
              <p className="text-xs text-purple-600/80 dark:text-purple-400/70 mt-1">Ganho limpo de juros</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-500/20 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">despesas</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatBRL(summary?.despesas)}</p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-1">
                Fixas: {formatBRL(summary?.despesas_fixas)} · Variáveis: {formatBRL(summary?.despesas_variaveis)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">coletados</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatBRL(summary?.recebido)}</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-1">Dinheiro efetivo entrado</p>
            </div>
          </div>

          {/* Key Metric Grid - Row 2 (DRE & Resumo Apurado) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">valor de todos clintes + juros</p>
              <p className="text-2xl font-black text-brand-blue mt-1">{formatBRL(summary?.a_receber)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Saldo pendente em produtos e juros</p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-black p-5 rounded-2xl text-white shadow-md border border-slate-700">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">meu lucro - as despesas</p>
              <p className="text-2xl font-black text-white mt-1">{formatBRL(summary?.lucro_liquido_apurado)}</p>
              <p className="text-xs text-slate-300 mt-1">Juros limpos ({formatBRL(summary?.juros_limpos)}) - Despesas ({formatBRL(summary?.despesas)})</p>
            </div>

            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-5 rounded-2xl shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">pessoas que nao pagaram</p>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{formatBRL(summary?.valores_atrasados)}</p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-1">Parcelas vencidas em atraso</p>
            </div>
          </div>

          {/* Visual Comparison Chart (RECEITAS X DESPESAS) */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">Comparativo Visual: Receitas x Despesas</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Evolução dos recebimentos versus gastos no período selecionado</p>
              </div>
              {data?.chartData?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTable((prev) => !prev)}
                  className="self-start flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                >
                  {showTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
                  {showTable ? 'Ver gráfico' : 'Ver tabela'}
                </button>
              )}
            </div>

            {data?.chartData?.length > 0 && <ChartLegend colors={chartColors} />}

            {data?.chartData?.length === 0 ? (
              <div className="h-72 sm:h-80 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                Sem lançamentos para gerar o gráfico no período selecionado.
              </div>
            ) : showTable ? (
              <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs uppercase font-extrabold tracking-wider">
                      <th className="p-3 px-4">Data</th>
                      <th className="p-3 text-right">Recebido</th>
                      <th className="p-3 text-right px-4">Despesa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.chartData.map((row) => (
                      <tr key={row.date}>
                        <td className="p-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">{formatDate(row.date)}</td>
                        <td className="p-3 text-right font-bold" style={{ color: chartColors.recebido }}>{formatBRL(row.recebido || 0)}</td>
                        <td className="p-3 text-right px-4 font-bold" style={{ color: chartColors.despesa }}>{formatBRL(row.despesa || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4} barCategoryGap="24%">
                    <defs>
                      <linearGradient id="recebidoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.recebido} stopOpacity={1} />
                        <stop offset="100%" stopColor={chartColors.recebido} stopOpacity={0.65} />
                      </linearGradient>
                      <linearGradient id="despesaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.despesa} stopOpacity={1} />
                        <stop offset="100%" stopColor={chartColors.despesa} stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={gridColor} strokeOpacity={0.7} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      stroke={axisColor}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      tickFormatter={(v) => `R$${v}`}
                      stroke={axisColor}
                      fontSize={12}
                      width={70}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip isDark={isDark} />}
                      cursor={{ fill: isDark ? '#ffffff0d' : '#0000000a' }}
                    />
                    <Bar
                      dataKey="recebido"
                      name="Recebimentos (Entradas)"
                      fill="url(#recebidoGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={22}
                    />
                    <Bar
                      dataKey="despesa"
                      name="Despesas (Saídas)"
                      fill="url(#despesaGradient)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
