import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, MapPin, Edit, Trash2, Eye, ShoppingCart, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate, formatPhone, getStatusBadge } from '../utils/formatters';

export default function CustomersPage({ onOpenNewCustomer, onEditCustomer }) {
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
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-blue" />
            Gestão de Clientes
          </h2>
          <p className="text-sm text-slate-500">Cadastre e acompanhe o histórico de compras e parcelas de cada cliente.</p>
        </div>
        <button
          onClick={() => onOpenNewCustomer(null)}
          className="bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-3 px-5 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ NOVO CLIENTE</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nome, telefone ou cidade..."
          className="w-full text-slate-800 text-sm font-medium focus:outline-none"
        />
      </div>

      {/* Customers Table (100% Width Layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Carregando lista de clientes...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-600">Nenhum cliente encontrado</p>
            <p className="text-xs">Cadastre novos clientes clicando no botão "+ NOVO CLIENTE" acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                  <th className="p-4 px-6">Cliente</th>
                  <th className="p-4">Telefone / WhatsApp</th>
                  <th className="p-4">Localização</th>
                  <th className="p-4 text-center">Vendas</th>
                  <th className="p-4 text-right">Saldo Devedor</th>
                  <th className="p-4 text-center">Situação</th>
                  <th className="p-4 text-right px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {customers.map((c) => {
                  const hasOverdue = parseInt(c.overdue_count || 0) > 0;
                  const hasDebt = parseFloat(c.total_debt || 0) > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 px-6 font-bold text-slate-800">
                        {c.name}
                      </td>
                      <td className="p-4 text-slate-600 font-mono">
                        {c.phone ? (
                          <a
                            href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {formatPhone(c.phone)}
                          </a>
                        ) : (
                          <span className="text-slate-400 font-sans italic">Não informado</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {c.city ? `${c.city}${c.state ? ` - ${c.state}` : ''}` : '-'}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700">
                        {c.total_sales || 0}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">
                        {hasDebt ? (
                          <span className={hasOverdue ? 'text-rose-600' : 'text-brand-blue'}>
                            {formatBRL(c.total_debt)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Quitado R$ 0,00</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {hasOverdue ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                            🔴 Em Atraso
                          </span>
                        ) : hasDebt ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            🟡 Em Aberto
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 Em Dia
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right px-6 space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleViewCustomer(c)}
                          title="Visualizar histórico"
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-xl transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditCustomer(c)}
                          title="Editar cliente"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          title="Excluir cliente"
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detailed Profile Modal/Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> {formatPhone(selectedCustomer.phone) || 'Sem telefone'} |
                  <MapPin className="w-3.5 h-3.5 text-brand-blue" /> {selectedCustomer.address || 'Sem endereço'}, {selectedCustomer.city || ''}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700">
                Fechar
              </button>
            </div>

            {loadingDetails ? (
              <div className="p-8 text-center text-slate-500">Carregando detalhes do cliente...</div>
            ) : (
              <div className="space-y-6">
                {/* Sales Section */}
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-brand-blue" />
                    Histórico de Vendas ({customerDetails?.sales?.length || 0})
                  </h4>
                  {customerDetails?.sales?.length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhuma venda registrada para este cliente.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerDetails?.sales?.map(s => (
                        <div key={s.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-sm">
                          <div>
                            <p className="font-bold text-slate-800">{s.product_name}</p>
                            <p className="text-xs text-slate-500">Data: {formatDate(s.sale_date)} | Modalidade: {s.payment_mode} ({s.installment_count}x)</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-800">{formatBRL(s.total_value)}</p>
                            <p className="text-xs text-slate-400">Juros: {formatBRL(s.interest_value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Installments Schedule */}
                <div>
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Cronograma de Parcelas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customerDetails?.installments?.map(i => {
                      const badge = getStatusBadge(i.status);
                      return (
                        <div key={i.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{i.product_name} (Parc. {i.installment_number})</p>
                            <p className="text-xs text-slate-500 mt-0.5">Vencimento: <span className="font-bold">{formatDate(i.due_date)}</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-800">{formatBRL(i.amount)}</p>
                            <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
