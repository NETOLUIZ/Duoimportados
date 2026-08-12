import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  ArrowRight,
  Phone,
  Calendar,
  CreditCard
} from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';

export default function DashboardPage({ onOpenNewSale, onOpenPayment }) {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState({ atrasados: [], vencendo: [], recem_pagos: [] });
  const [activeTab, setActiveTab] = useState('atrasados'); // 'atrasados', 'vencendo', 'pagos'
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, alertRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/alerts')
      ]);
      setSummary(sumRes.data);
      setAlerts(alertRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600">Carregando indicadores financeiros...</p>
        </div>
      </div>
    );
  }

  const isProfitPositive = parseFloat(summary?.lucro || 0) >= 0;

  return (
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Top Banner Action */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Visão Geral das Vendas & Crediário</h2>
          <p className="text-sm text-slate-300 mt-1">
            Acompanhe recebimentos, clientes atrasados e lucro em tempo real.
          </p>
        </div>
        <button
          onClick={onOpenNewSale}
          className="bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>REGISTRAR NOVA VENDA</span>
        </button>
      </div>

      {/* 8 Core Summary Cards (Section 3 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vendas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Vendas Totais</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{formatBRL(summary?.vendas)}</p>
            <p className="text-xs text-slate-400 mt-1">Valor acumulado</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Recebido */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Recebido</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatBRL(summary?.recebido)}</p>
            <p className="text-xs text-emerald-600/80 mt-1">Total quitado em caixa</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: A Receber */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">A Receber</p>
            <p className="text-2xl font-black text-brand-blue mt-1">{formatBRL(summary?.a_receber)}</p>
            <p className="text-xs text-slate-400 mt-1">Parcelas pendentes</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Despesas */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Despesas</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{formatBRL(summary?.despesas)}</p>
            <p className="text-xs text-rose-600/80 mt-1">Custos operacionais</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 5: Lucro */}
        <div className={`bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between ${isProfitPositive ? 'border-emerald-200' : 'border-rose-200'}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isProfitPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              Lucro Realizado
            </p>
            <p className={`text-2xl font-black mt-1 ${isProfitPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatBRL(summary?.lucro)}
            </p>
            <p className="text-xs text-slate-400 mt-1">(Recebido - Despesas)</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isProfitPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 6: Clientes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Clientes Ativos</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{summary?.clientes_ativos || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Cadastrados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 7: Atrasados 🔴 */}
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              🔴 Parcelas Atrasadas
            </p>
            <p className="text-2xl font-black text-rose-700 mt-1">{summary?.atrasados?.count || 0} parcelas</p>
            <p className="text-xs font-bold text-rose-800 mt-0.5">{formatBRL(summary?.atrasados?.value)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 8: Vencendo em 2 dias 🟡 */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              🟡 Vencendo em 2 dias
            </p>
            <p className="text-2xl font-black text-amber-800 mt-1">{summary?.vencendo_2_dias?.count || 0} parcelas</p>
            <p className="text-xs font-bold text-amber-900 mt-0.5">{formatBRL(summary?.vencendo_2_dias?.value)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CENTRAL DE ALERTAS ("Precisa da sua atenção" - Section 4 Requirement) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Precisa da sua atenção
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Clientes que exigem contato para cobrança ou acompanhamento de pagamento
            </p>
          </div>

          {/* Alert Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('atrasados')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'atrasados'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              🔴 ATRASADOS ({alerts.atrasados.length})
            </button>

            <button
              onClick={() => setActiveTab('vencendo')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'vencendo'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              🟡 VENCENDO EM 2 DIAS ({alerts.vencendo.length})
            </button>

            <button
              onClick={() => setActiveTab('pagos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'pagos'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              🟢 RECÉM PAGOS ({alerts.recem_pagos.length})
            </button>
          </div>
        </div>

        {/* Tab Content List */}
        <div className="divide-y divide-slate-100">
          {activeTab === 'atrasados' && (
            alerts.atrasados.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                🎉 Nenhuma parcela atrasada! Todos os clientes estão em dia.
              </div>
            ) : (
              alerts.atrasados.map((item) => (
                <div key={item.id} className="p-4 px-6 hover:bg-rose-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                      🔴
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.customer_name}</p>
                      <p className="text-xs text-slate-500">
                        Produto: <span className="font-semibold text-slate-700">{item.product_name}</span> (Parcela {item.installment_number})
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Venceu em: {formatDate(item.due_date)}
                        </span>
                        {item.customer_phone && (
                          <a
                            href={`https://wa.me/55${item.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> {item.customer_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Valor da Parcela</p>
                      <p className="text-base font-black text-rose-600">{formatBRL(item.amount)}</p>
                    </div>
                    <button
                      onClick={() => onOpenPayment(item)}
                      className="bg-brand-green hover:bg-brand-greenHover text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>REGISTRAR PAGAMENTO</span>
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'vencendo' && (
            alerts.vencendo.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nenhuma parcela vencendo nos próximos 2 dias.
              </div>
            ) : (
              alerts.vencendo.map((item) => (
                <div key={item.id} className="p-4 px-6 hover:bg-amber-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      🟡
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.customer_name}</p>
                      <p className="text-xs text-slate-500">
                        Produto: <span className="font-semibold text-slate-700">{item.product_name}</span> (Parcela {item.installment_number})
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Vence em: {formatDate(item.due_date)}
                        </span>
                        {item.customer_phone && (
                          <a
                            href={`https://wa.me/55${item.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> {item.customer_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Valor a Vencer</p>
                      <p className="text-base font-black text-amber-600">{formatBRL(item.amount)}</p>
                    </div>
                    <button
                      onClick={() => onOpenPayment(item)}
                      className="bg-brand-green hover:bg-brand-greenHover text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>REGISTRAR PAGAMENTO</span>
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {activeTab === 'pagos' && (
            alerts.recem_pagos.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nenhum pagamento registrado recentemente.
              </div>
            ) : (
              alerts.recem_pagos.map((item) => (
                <div key={item.id} className="p-4 px-6 hover:bg-emerald-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      🟢
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.customer_name}</p>
                      <p className="text-xs text-slate-500">
                        Produto: <span className="font-semibold text-slate-700">{item.product_name}</span> (Parcela {item.installment_number})
                      </p>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">
                        Pago em: {formatDate(item.payment_date || item.paid_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Valor Quitado</p>
                    <p className="text-base font-black text-emerald-600">{formatBRL(item.last_amount_paid || item.amount_paid)}</p>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
