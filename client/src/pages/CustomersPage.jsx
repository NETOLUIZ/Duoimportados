import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, MapPin, Edit, Trash2, Eye, ShoppingCart, Clock, X, TrendingUp, PiggyBank, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatBRL, formatDate, formatPhone } from '../utils/formatters';
import StatusBadge, { InstallmentStatusBadge } from '../components/StatusBadge';

function CustomerSituationBadge({ hasOverdue, hasDebt }) {
  if (hasOverdue) return <StatusBadge tone="danger" label="Em Atraso" icon={AlertTriangle} />;
  if (hasDebt) return <StatusBadge tone="warning" label="Em Aberto" icon={Clock} />;
  return <StatusBadge tone="success" label="Em Dia" icon={CheckCircle2} />;
}

export default function CustomersPage({ onOpenNewCustomer, onEditCustomer }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}`);
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleViewCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/customers/${cust.id}`);
      setCustomerDetails(res.data);
    } catch (err) {
      console.error('Error fetching customer details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${name}"? Todas as vendas e parcelas serão apagadas.`)) {
      try {
        await api.delete(`/customers/${id}`);
        fetchCustomers();
        if (selectedCustomer?.id === id) {
          setSelectedCustomer(null);
        }
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao excluir cliente.');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-brand-blue" />
            Gestão de Clientes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Cadastre e acompanhe o histórico de compras e parcelas de cada cliente.</p>
        </div>
        <button
          onClick={() => onOpenNewCustomer(null)}
          className="w-full sm:w-auto bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-3 px-5 min-h-[44px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>NOVO CLIENTE</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nome, telefone ou cidade..."
          className="w-full bg-transparent text-slate-800 dark:text-slate-100 text-sm font-medium focus:outline-none min-h-[28px]"
        />
      </div>

      {/* Customers List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Carregando lista de clientes...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhum cliente encontrado</p>
            <p className="text-xs">Cadastre novos clientes clicando no botão "NOVO CLIENTE" acima.</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((c) => {
                const hasOverdue = parseInt(c.overdue_count || 0) > 0;
                const hasDebt = parseFloat(c.total_debt || 0) > 0;
                return (
                  <div key={c.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {c.city ? `${c.city}${c.state ? ` - ${c.state}` : ''}` : 'Sem localização'}
                        </p>
                      </div>
                      <CustomerSituationBadge hasOverdue={hasOverdue} hasDebt={hasDebt} />
                    </div>

                    {c.phone && (
                      <a
                        href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-1.5 w-fit"
                      >
                        <Phone className="w-3.5 h-3.5" /> {formatPhone(c.phone)}
                      </a>
                    )}

                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-slate-500 dark:text-slate-400">{c.total_sales || 0} venda(s)</span>
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        Emprestado: {formatBRL(c.total_borrowed)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 dark:text-slate-500 text-xs">Saldo devedor</span>
                      <span className={`font-black ${hasDebt ? (hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-brand-blue') : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {hasDebt ? formatBRL(c.total_debt) : 'Quitado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleViewCustomer(c)}
                        className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-brand-blue rounded-xl text-xs font-bold"
                      >
                        <Eye className="w-4 h-4" /> Ver
                      </button>
                      <button
                        onClick={() => onEditCustomer(c)}
                        className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                      >
                        <Edit className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        aria-label={`Excluir cliente ${c.name}`}
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
                    <th className="p-4 px-6">Cliente</th>
                    <th className="p-4">Telefone / WhatsApp</th>
                    <th className="p-4">Localização</th>
                    <th className="p-4 text-center">Vendas</th>
                    <th className="p-4 text-right">Valor Emprestado</th>
                    <th className="p-4 text-right">Saldo Devedor</th>
                    <th className="p-4 text-center">Situação</th>
                    <th className="p-4 text-right px-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                  {customers.map((c) => {
                    const hasOverdue = parseInt(c.overdue_count || 0) > 0;
                    const hasDebt = parseFloat(c.total_debt || 0) > 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 px-6 font-bold text-slate-800 dark:text-slate-100">
                          {c.name}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-mono">
                          {c.phone ? (
                            <a
                              href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {formatPhone(c.phone)}
                            </a>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-sans italic">Não informado</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {c.city ? `${c.city}${c.state ? ` - ${c.state}` : ''}` : '-'}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {c.total_sales || 0}
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                          {formatBRL(c.total_borrowed)}
                        </td>
                        <td className="p-4 text-right font-black text-slate-800 dark:text-slate-100">
                          {hasDebt ? (
                            <span className={hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-brand-blue'}>
                              {formatBRL(c.total_debt)}
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Quitado R$ 0,00</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <CustomerSituationBadge hasOverdue={hasOverdue} hasDebt={hasDebt} />
                        </td>
                        <td className="p-4 text-right px-6 space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleViewCustomer(c)}
                            title="Visualizar histórico"
                            aria-label={`Visualizar histórico de ${c.name}`}
                            className="p-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-brand-blue rounded-xl transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditCustomer(c)}
                            title="Editar cliente"
                            aria-label={`Editar cliente ${c.name}`}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user?.role !== 'OPERATOR' && (
                            <button
                              onClick={() => handleDelete(c.id, c.name)}
                              title="Excluir cliente"
                              aria-label={`Excluir cliente ${c.name}`}
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

      {/* Customer Detailed Profile Modal/Drawer */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedCustomer(null); }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100 truncate">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {formatPhone(selectedCustomer.phone) || 'Sem telefone'}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-blue" /> {selectedCustomer.address || 'Sem endereço'}, {selectedCustomer.city || ''}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                aria-label="Fechar"
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {loadingDetails ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando detalhes do cliente...</div>
              ) : (
                <div className="space-y-6">
                  {/* Financial Summary: what the admin needs to see at a glance */}
                  {customerDetails?.summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5" /> Total Investido
                        </p>
                        <p className="text-lg font-black text-blue-700 dark:text-blue-400 mt-1">{formatBRL(customerDetails.summary.total_invested)}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" /> Total de Juros
                        </p>
                        <p className="text-lg font-black text-amber-700 dark:text-amber-400 mt-1">{formatBRL(customerDetails.summary.total_interest)}</p>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <PiggyBank className="w-3.5 h-3.5" /> Total Geral
                        </p>
                        <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{formatBRL(customerDetails.summary.total_value)}</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Já Recebido
                        </p>
                        <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatBRL(customerDetails.summary.total_received)}</p>
                      </div>
                    </div>
                  )}

                  {/* Sales Section */}
                  <div>
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-brand-blue" />
                      Histórico de Vendas ({customerDetails?.sales?.length || 0})
                    </h4>
                    {customerDetails?.sales?.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">Nenhuma venda registrada para este cliente.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerDetails?.sales?.map(s => (
                          <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-sm">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">{s.product_name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Data: {formatDate(s.sale_date)} | Modalidade: {s.payment_mode} ({s.installment_count}x)</p>
                            </div>
                            <div className="sm:text-right">
                              <p className="font-black text-slate-800 dark:text-slate-100">{formatBRL(s.total_value)}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">Juros: {formatBRL(s.interest_value)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Installments Schedule */}
                  <div>
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Cronograma de Parcelas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customerDetails?.installments?.map(i => (
                        <div key={i.id} className="p-3.5 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between shadow-sm gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{i.product_name} (Parc. {i.installment_number})</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vencimento: <span className="font-bold">{formatDate(i.due_date)}</span></p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100">{formatBRL(i.amount)}</p>
                            <InstallmentStatusBadge status={i.status} className="mt-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
