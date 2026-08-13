import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Phone, CheckCircle, CalendarClock } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate, formatPhone, getFrequencyLabel } from '../utils/formatters';
import { InstallmentStatusBadge } from '../components/StatusBadge';

const FILTERS = [
  { id: '', label: 'Todas', activeClass: 'bg-navy-900 text-white shadow-sm' },
  { id: 'ATRASADA', label: 'Atrasadas', activeClass: 'bg-rose-600 text-white shadow-sm' },
  { id: 'VENCENDO', label: 'Vencendo 2 Dias', activeClass: 'bg-amber-500 text-white shadow-sm' },
  { id: 'PENDENTE', label: 'Pendentes', activeClass: 'bg-blue-600 text-white shadow-sm' },
  { id: 'PAGA', label: 'Pagas', activeClass: 'bg-emerald-600 text-white shadow-sm' },
];

const MODE_FILTERS = [
  { id: '', label: 'Todas' },
  { id: 'DIARIA', label: 'Diária' },
  { id: 'QUINZENAL', label: 'Quinzenal' },
  { id: 'MENSAL', label: 'Mensal' },
];

export default function InstallmentsPage({ onOpenPayment }) {
  const [installments, setInstallments] = useState([]);
  const [statusFilter, setStatusFilter] = useState(''); // '', 'ATRASADA', 'VENCENDO', 'PENDENTE', 'PAGA'
  const [modeFilter, setModeFilter] = useState(''); // '', 'DIARIA', 'QUINZENAL', 'MENSAL'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (modeFilter) params.append('payment_mode', modeFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/installments?${params.toString()}`);
      setInstallments(res.data);
    } catch (err) {
      console.error('Error fetching installments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallments();
  }, [statusFilter, modeFilter, search]);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 dark:text-emerald-400" />
            Controle de Recebimentos & Parcelas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe vencimentos e registre pagamentos recebidos dos clientes.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto w-full md:w-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-2 min-h-[36px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === f.id ? f.activeClass : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modality Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex-shrink-0">
          <CalendarClock className="w-4 h-4 text-brand-blue" />
          Modalidade:
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1 border border-slate-200 dark:border-slate-700 overflow-x-auto w-full md:w-auto">
          {MODE_FILTERS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModeFilter(m.id)}
              className={`px-3 py-2 min-h-[36px] rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                modeFilter === m.id ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Installments List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Carregando parcelas...</div>
        ) : installments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <CreditCard className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhuma parcela encontrada nesta categoria</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {installments.map((inst) => {
                const isPaid = inst.status === 'PAGA';
                return (
                  <div key={inst.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{inst.customer_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{inst.product_name} &middot; Parc. {inst.installment_number}/{inst.installment_count} &middot; {getFrequencyLabel(inst.payment_mode)}</p>
                      </div>
                      <InstallmentStatusBadge status={inst.status} />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Vencimento: <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(inst.due_date)}</span></span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="font-black text-slate-800 dark:text-slate-100">{formatBRL(inst.amount)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">Pago: {formatBRL(inst.amount_paid)}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {inst.customer_phone && (
                        <a
                          href={`https://wa.me/55${inst.customer_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold"
                        >
                          <Phone className="w-3.5 h-3.5" /> {formatPhone(inst.customer_phone)}
                        </a>
                      )}
                      {!isPaid && (
                        <button
                          onClick={() => onOpenPayment(inst)}
                          className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 bg-brand-green hover:bg-brand-greenHover text-white rounded-xl text-xs font-bold shadow-md"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Registrar Pagamento
                        </button>
                      )}
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
                    <th className="p-4 px-6">Cliente</th>
                    <th className="p-4">Produto / Parcela</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4 text-right">Valor Parcela</th>
                    <th className="p-4 text-right">Valor Pago</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right px-6">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                  {installments.map((inst) => {
                    const isPaid = inst.status === 'PAGA';

                    return (
                      <tr key={inst.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 px-6 font-bold text-slate-800 dark:text-slate-100">
                          <div>{inst.customer_name}</div>
                          {inst.customer_phone && (
                            <a
                              href={`https://wa.me/55${inst.customer_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 hover:underline mt-0.5"
                            >
                              <Phone className="w-3 h-3" /> {formatPhone(inst.customer_phone)}
                            </a>
                          )}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300">
                          <div className="font-semibold">{inst.product_name}</div>
                          <div className="text-xs text-brand-blue font-bold">
                            Parcela {inst.installment_number} de {inst.installment_count} &middot; {getFrequencyLabel(inst.payment_mode)}
                          </div>
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                          {formatDate(inst.due_date)}
                        </td>
                        <td className="p-4 text-right font-black text-slate-800 dark:text-slate-100">
                          {formatBRL(inst.amount)}
                        </td>
                        <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBRL(inst.amount_paid)}
                        </td>
                        <td className="p-4 text-center">
                          <InstallmentStatusBadge status={inst.status} />
                        </td>
                        <td className="p-4 text-right px-6">
                          {!isPaid ? (
                            <button
                              onClick={() => onOpenPayment(inst)}
                              className="bg-brand-green hover:bg-brand-greenHover text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 ml-auto min-h-[36px]"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>REGISTRAR PAGAMENTO</span>
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                              <CheckCircle className="w-4 h-4" /> Quitado
                            </span>
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
    </div>
  );
}
