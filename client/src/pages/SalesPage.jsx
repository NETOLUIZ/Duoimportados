import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Eye, Edit, X, Search, Calendar, Filter } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatBRL, formatDate, getFrequencyLabel } from '../utils/formatters';
import { InstallmentStatusBadge } from '../components/StatusBadge';
import EditSaleModal from '../components/EditSaleModal';

const STATUS_FILTERS = [
  { id: '', label: 'Todas', activeClass: 'bg-navy-900 text-white shadow-sm' },
  { id: 'PENDENTE', label: 'Em aberto', activeClass: 'bg-amber-500 text-white shadow-sm' },
  { id: 'QUITADA', label: 'Quitadas', activeClass: 'bg-emerald-600 text-white shadow-sm' },
];

const MODE_FILTERS = [
  { id: '', label: 'Todas Modalidades' },
  { id: 'DIARIA', label: 'Diária' },
  { id: 'QUINZENAL', label: 'Quinzenal' },
  { id: 'MENSAL', label: 'Mensal' },
];

const PERIOD_FILTERS = [
  { id: '', label: 'Todas as Datas' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'este_mes', label: 'Este Mês' },
  { id: 'mes_anterior', label: 'Mês Anterior' },
  { id: 'ultimos_30_dias', label: 'Últimos 30 Dias' },
];

export default function SalesPage({ onOpenNewSale }) {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleDeleteSale = async (id, productName) => {
    if (window.confirm(`Excluir a venda "${productName}"? As parcelas vinculadas também serão removidas.`)) {
      try {
        await api.delete(`/sales/${id}`);
        fetchSales();
        if (selectedSale?.sale?.id === id) setSelectedSale(null);
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao excluir venda.');
      }
    }
  };

  const handleViewSale = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      setSelectedSale(res.data);
    } catch (err) {
      console.error('Error loading sale details:', err);
    }
  };

  const filteredSales = sales.filter((s) => {
    const matchesSearch = !search.trim() ||
      s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_phone?.includes(search);

    const isFullyPaid = parseFloat(s.remaining_balance) <= 0;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'QUITADA' && isFullyPaid) ||
      (statusFilter === 'PENDENTE' && !isFullyPaid);

    const matchesMode = !modeFilter || s.payment_mode === modeFilter;

    let matchesPeriod = true;
    if (periodFilter && s.sale_date) {
      const cleanDateStr = String(s.sale_date).split('T')[0];
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      if (periodFilter === 'hoje') {
        matchesPeriod = cleanDateStr === todayStr;
      } else if (periodFilter === 'este_mes') {
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        matchesPeriod = cleanDateStr.startsWith(`${year}-${month}`);
      } else if (periodFilter === 'mes_anterior') {
        const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const year = prevMonth.getUTCFullYear();
        const month = String(prevMonth.getUTCMonth() + 1).padStart(2, '0');
        matchesPeriod = cleanDateStr.startsWith(`${year}-${month}`);
      } else if (periodFilter === 'ultimos_30_dias') {
        const start = new Date();
        start.setUTCDate(start.getUTCDate() - 29);
        const startStr = start.toISOString().split('T')[0];
        matchesPeriod = cleanDateStr >= startStr && cleanDateStr <= todayStr;
      }
    }

    return matchesSearch && matchesStatus && matchesMode && matchesPeriod;
  });

  const totalFilteredValue = filteredSales.reduce((acc, curr) => acc + parseFloat(curr.total_value || 0), 0);
  const totalFilteredPaid = filteredSales.reduce((acc, curr) => acc + parseFloat(curr.total_paid || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-brand-blue" />
            Registro de Vendas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Histórico completo de vendas e cálculo de parcelamento.</p>
        </div>
        <button
          onClick={onOpenNewSale}
          className="w-full sm:w-auto bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-3 px-5 min-h-[44px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>NOVA VENDA</span>
        </button>
      </div>

      {/* Summary of Filtered Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vendas Filtradas</p>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{filteredSales.length} {filteredSales.length === 1 ? 'venda' : 'vendas'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Total do Período/Filtro</p>
          <p className="text-xl font-black text-brand-blue mt-0.5">{formatBRL(totalFilteredValue)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Recebido (Filtrado)</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatBRL(totalFilteredPaid)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente ou produto..."
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 font-medium focus:outline-none"
            />
          </div>

          {/* Period Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 uppercase flex-shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-blue" /> Período:
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto">
              {PERIOD_FILTERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    periodFilter === p.id ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Status & Modality */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase flex-shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === f.id ? f.activeClass : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase flex-shrink-0">Modalidade:</span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto">
              {MODE_FILTERS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModeFilter(m.id)}
                  className={`px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    modeFilter === m.id ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Carregando registro de vendas...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-600 dark:text-slate-300">
              {sales.length === 0 ? 'Nenhuma venda realizada ainda' : 'Nenhuma venda encontrada com os filtros selecionados'}
            </p>
            <p className="text-xs">
              {sales.length === 0 ? 'Registre uma nova venda parcelada clicando no botão "NOVA VENDA".' : 'Tente buscar com outro termo ou alterar os filtros.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSales.map((s) => {
                const isFullyPaid = parseFloat(s.remaining_balance) <= 0;
                return (
                  <div key={s.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{s.product_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.customer_name}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 flex-shrink-0">{formatDate(s.sale_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.installment_count}x {getFrequencyLabel(s.payment_mode)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Total da Venda</p>
                        <p className="font-black text-slate-800 dark:text-slate-100">{formatBRL(s.total_value)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Recebido</p>
                        <p className={`font-bold ${isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-blue'}`}>{formatBRL(s.total_paid)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleViewSale(s.id)}
                        className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-brand-blue rounded-xl text-xs font-bold"
                      >
                        <Eye className="w-4 h-4" /> Ver Parcelas
                      </button>
                      <button
                        onClick={() => setEditingSale(s)}
                        aria-label={`Editar venda ${s.product_name}`}
                        className="w-11 min-h-[40px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSale(s.id, s.product_name)}
                        aria-label={`Excluir venda ${s.product_name}`}
                        className="w-11 min-h-[40px] flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 px-6">Data</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Produto</th>
                    <th className="p-4 text-center">Modalidade</th>
                    <th className="p-4 text-right">Valor Produto</th>
                    <th className="p-4 text-right">Juros</th>
                    <th className="p-4 text-right">Total Venda</th>
                    <th className="p-4 text-right">Recebido</th>
                    <th className="p-4 text-right px-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                  {filteredSales.map((s) => {
                const isFullyPaid = parseFloat(s.remaining_balance) <= 0;
                return (
                  <div key={s.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{s.product_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.customer_name}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 flex-shrink-0">{formatDate(s.sale_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {s.installment_count}x {getFrequencyLabel(s.payment_mode)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Total da Venda</p>
                        <p className="font-black text-slate-800 dark:text-slate-100">{formatBRL(s.total_value)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Recebido</p>
                        <p className={`font-bold ${isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-blue'}`}>{formatBRL(s.total_paid)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleViewSale(s.id)}
                        className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-brand-blue rounded-xl text-xs font-bold"
                      >
                        <Eye className="w-4 h-4" /> Ver Parcelas
                      </button>
                      <button
                        onClick={() => setEditingSale(s)}
                        aria-label={`Editar venda ${s.product_name}`}
                        className="w-11 min-h-[40px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSale(s.id, s.product_name)}
                        aria-label={`Excluir venda ${s.product_name}`}
                        className="w-11 min-h-[40px] flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 px-6">Data</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Produto</th>
                    <th className="p-4 text-center">Modalidade</th>
                    <th className="p-4 text-right">Valor Produto</th>
                    <th className="p-4 text-right">Juros</th>
                    <th className="p-4 text-right">Total Venda</th>
                    <th className="p-4 text-right">Recebido</th>
                    <th className="p-4 text-right px-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                  {sales.map((s) => {
                    const isFullyPaid = parseFloat(s.remaining_balance) <= 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 px-6 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                          {formatDate(s.sale_date)}
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                          {s.customer_name}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-semibold">
                          {s.product_name}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {s.installment_count}x {getFrequencyLabel(s.payment_mode)}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-600 dark:text-slate-300">
                          {formatBRL(s.product_value)}
                        </td>
                        <td className="p-4 text-right text-amber-600 dark:text-amber-400 font-semibold">
                          {formatBRL(s.interest_value)}
                        </td>
                        <td className="p-4 text-right font-black text-slate-800 dark:text-slate-100">
                          {formatBRL(s.total_value)}
                        </td>
                        <td className="p-4 text-right font-bold">
                          <span className={isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-blue'}>
                            {formatBRL(s.total_paid)}
                          </span>
                        </td>
                        <td className="p-4 text-right px-6 space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleViewSale(s.id)}
                            title="Ver parcelas"
                            aria-label={`Ver parcelas da venda ${s.product_name}`}
                            className="p-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-brand-blue rounded-xl transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSale(s)}
                            title="Editar venda"
                            aria-label={`Editar venda ${s.product_name}`}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user?.role !== 'OPERATOR' && (
                            <button
                              onClick={() => handleDeleteSale(s.id, s.product_name)}
                              title="Excluir venda"
                              aria-label={`Excluir venda ${s.product_name}`}
                              className="p-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Sale Detail & Installments Modal */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedSale(null); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 truncate">{selectedSale.sale.product_name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cliente: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedSale.sale.customer_name}</span> | Data: {formatDate(selectedSale.sale.sale_date)}</p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                aria-label="Fechar"
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Installments List */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Parcelas Geradas</h4>
              <div className="space-y-2">
                {selectedSale.installments.map((inst) => (
                  <div key={inst.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-bold text-brand-blue mr-2">Parcela {inst.installment_number}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Vencimento: {formatDate(inst.due_date)}</span>
                    </div>
                    <div className="text-right flex items-center gap-3 flex-shrink-0">
                      <div>
                        <p className="font-black text-slate-800 dark:text-slate-100">{formatBRL(inst.amount)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Pago: {formatBRL(inst.amount_paid)}</p>
                      </div>
                      <InstallmentStatusBadge status={inst.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <EditSaleModal
        isOpen={!!editingSale}
        sale={editingSale}
        onClose={() => setEditingSale(null)}
        onSuccess={fetchSales}
      />
    </div>
  );
}
