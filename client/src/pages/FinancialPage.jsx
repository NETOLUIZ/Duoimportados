import React, { useState, useEffect } from 'react';
import { TrendingUp, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

const PERIODS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ultimos_7_dias', label: 'Últimos 7 dias' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_anterior', label: 'Mês anterior' },
  { id: 'ultimos_30_dias', label: 'Últimos 30 dias' },
  { id: 'custom', label: 'Personalizado' },
];

export default function FinancialPage() {
  const { isDark } = useTheme();
  const [period, setPeriod] = useState('este_mes'); // hoje, ultimos_7_dias, este_mes, mes_anterior, ultimos_30_dias, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vendas no Período</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{formatBRL(summary?.vendas)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Total comercializado</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Recebido (Caixa)</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatBRL(summary?.recebido)}</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-1">Dinheiro efetivo entrado</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-500/20 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Despesas no Período</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatBRL(summary?.despesas)}</p>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-1">Custos pagos</p>
            </div>

            <div className="bg-slate-900 dark:bg-black/40 p-5 rounded-2xl text-white shadow-md border border-transparent dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Lucro Realizado</p>
              <p className="text-2xl font-black text-white mt-1">{formatBRL(summary?.lucro_realizado)}</p>
              <p className="text-xs text-slate-400 mt-1">Recebido - Despesas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">A Receber (Previsto)</p>
              <p className="text-xl font-black text-brand-blue mt-1">{formatBRL(summary?.a_receber)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Lucro Previsto Total</p>
              <p className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">{formatBRL(summary?.lucro_previsto)}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-5 rounded-2xl shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">Valores Atrasados Geral</p>
              <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">{formatBRL(summary?.valores_atrasados)}</p>
            </div>
          </div>

          {/* Visual Comparison Chart (RECEITAS X DESPESAS) */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">Comparativo Visual: Receitas x Despesas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Evolução dos recebimentos versus gastos no período selecionado</p>
            </div>

            <div className="h-72 sm:h-80 w-full pt-4">
              {data?.chartData?.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                  Sem lançamentos para gerar o gráfico no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke={axisColor} fontSize={12} />
                    <YAxis tickFormatter={(v) => `R$${v}`} stroke={axisColor} fontSize={12} width={70} />
                    <Tooltip
                      formatter={(value) => [formatBRL(value), '']}
                      labelFormatter={formatDate}
                      contentStyle={isDark ? { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' } : { borderRadius: '12px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="recebido" name="Recebimentos (Entradas)" fill="#16A34A" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesas (Saídas)" fill="#DC2626" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
