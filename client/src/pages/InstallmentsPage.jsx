import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Calendar, Phone, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate, formatPhone, getStatusBadge } from '../utils/formatters';

export default function InstallmentsPage({ onOpenPayment }) {
  const [installments, setInstallments] = useState([]);
  const [statusFilter, setStatusFilter] = useState(''); // '', 'ATRASADA', 'VENCENDO', 'PENDENTE', 'PAGA'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
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
  }, [statusFilter, search]);

  return (
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" />
            Controle de Recebimentos & Parcelas
          </h2>
          <p className="text-sm text-slate-500">Acompanhe vencimentos e registre pagamentos recebidos dos clientes.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou produto..."
            className="w-full bg-transparent text-sm text-slate-800 font-medium focus:outline-none"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 border border-slate-200 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === '' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStatusFilter('ATRASADA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'ATRASADA' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔴 Atrasadas
          </button>
          <button
            onClick={() => setStatusFilter('VENCENDO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'VENCENDO' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🟡 Vencendo 2 Dias
          </button>
          <button
            onClick={() => setStatusFilter('PENDENTE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'PENDENTE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('PAGA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'PAGA' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🟢 Pagas
          </button>
        </div>
      </div>

      {/* Installments Table (100% Width Layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Carregando parcelas...</div>
        ) : installments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CreditCard className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-600">Nenhuma parcela encontrada nesta categoria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                  <th className="p-4 px-6">Cliente</th>
                  <th className="p-4">Produto / Parcela</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4 text-right">Valor Parcela</th>
                  <th className="p-4 text-right">Valor Pago</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right px-6">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {installments.map((inst) => {
                  const badge = getStatusBadge(inst.status);
                  const isPaid = inst.status === 'PAGA';

                  return (
                    <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 px-6 font-bold text-slate-800">
                        <div>{inst.customer_name}</div>
                        {inst.customer_phone && (
                          <a
                            href={`https://wa.me/55${inst.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 font-mono flex items-center gap-1 hover:underline mt-0.5"
                          >
                            <Phone className="w-3 h-3" /> {formatPhone(inst.customer_phone)}
                          </a>
                        )}
                      </td>
                      <td className="p-4 text-slate-700">
                        <div className="font-semibold">{inst.product_name}</div>
                        <div className="text-xs text-brand-blue font-bold">
                          Parcela {inst.installment_number} de {inst.installment_count}
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 font-bold whitespace-nowrap">
                        {formatDate(inst.due_date)}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">
                        {formatBRL(inst.amount)}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-600">
                        {formatBRL(inst.amount_paid)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-4 text-right px-6">
                        {!isPaid ? (
                          <button
                            onClick={() => onOpenPayment(inst)}
                            className="bg-brand-green hover:bg-brand-greenHover text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>REGISTRAR PAGAMENTO</span>
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
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
        )}
      </div>
    </div>
  );
}
