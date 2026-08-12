import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';

export default function FinancialPage() {
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

  return (
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-brand-blue" />
            Relatórios Financial & DRE
          </h2>
          <p className="text-sm text-slate-500">Comparativo visual de receitas vs despesas e projeção de lucro.</p>
        </div>
      </div>

      {/* Period Filter Buttons (Section 10 Requirement) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-brand-blue" />
          Filtrar Período:
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 border border-slate-200 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'ultimos_7_dias', label: 'Últimos 7 dias' },
            { id: 'este_mes', label: 'Este mês' },
            { id: 'mes_anterior', label: 'Mês anterior' },
            { id: 'ultimos_30_dias', label: 'Últimos 30 dias' },
            { id: 'custom', label: 'Personalizado' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                period === p.id ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Form if 'custom' selected */}
      {period === 'custom' && (
        <form onSubmit={handleCustomFilterSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 text-sm font-medium">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="bg-white border border-slate-300 rounded-xl p-2 font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="bg-white border border-slate-300 rounded-xl p-2 font-semibold text-slate-800"
            />
          </div>
          <button
            type="submit"
            className="mt-5 bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md"
          >
            APLICAR FILTRO
          </button>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 font-medium">Carregando relatório financeiro...</div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendas no Período</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{formatBRL(summary?.vendas)}</p>
              <p className="text-xs text-slate-400 mt-1">Total comercializado</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Recebido (Caixa)</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatBRL(summary?.recebido)}</p>
              <p className="text-xs text-emerald-600/80 mt-1">Dinheiro efetivo entrado</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Despesas no Período</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{formatBRL(summary?.despesas)}</p>
              <p className="text-xs text-rose-600/80 mt-1">Custos pagos</p>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-md">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Lucro Realizado</p>
              <p className="text-2xl font-black text-white mt-1">{formatBRL(summary?.lucro_realizado)}</p>
              <p className="text-xs text-slate-400 mt-1">Recebido - Despesas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">A Receber (Previsto)</p>
              <p className="text-xl font-black text-brand-blue mt-1">{formatBRL(summary?.a_receber)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Lucro Previsto Total</p>
              <p className="text-xl font-black text-purple-700 mt-1">{formatBRL(summary?.lucro_previsto)}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Valores Atrasados Geral</p>
              <p className="text-xl font-black text-rose-700 mt-1">{formatBRL(summary?.valores_atrasados)}</p>
            </div>
          </div>

          {/* Visual Comparison Chart (RECEITAS X DESPESAS) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Comparativo Visual: Receitas x Despesas</h3>
                <p className="text-xs text-slate-500">Evolução dos recebimentos versus gastos no período selecionado</p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              {data?.chartData?.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                  Sem lançamentos para gerar o gráfico no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" fontSize={12} />
                    <YAxis tickFormatter={(v) => `R$${v}`} stroke="#64748b" fontSize={12} />
                    <Tooltip formatter={(value) => [formatBRL(value), '']} labelFormatter={formatDate} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
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
