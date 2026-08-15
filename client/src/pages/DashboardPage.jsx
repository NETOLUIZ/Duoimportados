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
  Phone,
  Calendar,
  CreditCard,
  PartyPopper
} from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate, getWhatsAppLink } from '../utils/formatters';

const TABS = [
  { id: 'atrasados', label: 'Atrasados', icon: AlertCircle, activeClass: 'bg-rose-600 text-white shadow-md' },
  { id: 'vencendo', label: 'Vencendo em 2 dias', icon: Clock, activeClass: 'bg-amber-500 text-white shadow-md' },
  { id: 'pagos', label: 'Recém pagos', icon: CheckCircle2, activeClass: 'bg-emerald-600 text-white shadow-md' },
];

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
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Carregando indicadores financeiros...</p>
        </div>
      </div>
    );
  }

  const isProfitPositive = parseFloat(summary?.lucro || 0) >= 0;

  const activeList = activeTab === 'atrasados' ? alerts.atrasados : activeTab === 'vencendo' ? alerts.vencendo : alerts.recem_pagos;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Top Banner Action */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Visão Geral das Vendas & Crediário</h2>
          <p className="text-sm text-slate-300 mt-1">
            Acompanhe recebimentos, clientes atrasados e lucro em tempo real.
          </p>
        </div>
        <button
          onClick={onOpenNewSale}
          className="w-full md:w-auto bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm whitespace-nowrap min-h-[48px]"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>REGISTRAR NOVA VENDA</span>
        </button>
      </div>

      {/* Attention Cards: Parcelas Atrasadas e Vencendo em 2 dias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Atrasados */}
        <div className="bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/30 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
              Parcelas Atrasadas
            </p>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{summary?.atrasados?.count || 0} parcelas</p>
            <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">{formatBRL(summary?.atrasados?.value)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Vencendo em 2 dias */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-300 dark:border-amber-500/30 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Vencendo em 2 dias
            </p>
            <p className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{summary?.vencendo_2_dias?.count || 0} parcelas</p>
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300 mt-0.5">{formatBRL(summary?.vencendo_2_dias?.value)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CENTRAL DE ALERTAS ("Precisa da sua atenção") */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              Precisa da sua atenção
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Clientes que exigem contato para cobrança ou acompanhamento de pagamento
            </p>
          </div>

          {/* Alert Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 border border-slate-200 dark:border-slate-700 w-full sm:w-auto overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const count = tab.id === 'atrasados' ? alerts.atrasados.length : tab.id === 'vencendo' ? alerts.vencendo.length : alerts.recem_pagos.length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 sm:px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab.id ? tab.activeClass : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {activeList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center gap-2">
              {activeTab === 'atrasados' ? (
                <>
                  <PartyPopper className="w-8 h-8 text-emerald-500" />
                  <span>Nenhuma parcela atrasada! Todos os clientes estão em dia.</span>
                </>
              ) : activeTab === 'vencendo' ? (
                <span>Nenhuma parcela vencendo nos próximos 2 dias.</span>
              ) : (
                <span>Nenhum pagamento registrado recentemente.</span>
              )}
            </div>
          ) : (
            activeList.map((item) => {
              const tone = activeTab === 'atrasados' ? 'rose' : activeTab === 'vencendo' ? 'amber' : 'emerald';
              const ToneIcon = activeTab === 'atrasados' ? AlertCircle : activeTab === 'vencendo' ? Clock : CheckCircle2;
              const rowHoverClass =
                tone === 'rose' ? 'hover:bg-rose-50/50 dark:hover:bg-rose-500/5' :
                tone === 'amber' ? 'hover:bg-amber-50/50 dark:hover:bg-amber-500/5' :
                'hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5';

              return (
                <div key={item.id} className={`p-4 sm:px-6 ${rowHoverClass} transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tone === 'rose' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400' :
                      tone === 'amber' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400' :
                      'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
                    }`}>
                      <ToneIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.customer_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Produto: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.product_name}</span> (Parcela {item.installment_number})
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                        {activeTab !== 'pagos' ? (
                          <span className={`font-bold flex items-center gap-1 ${tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                            <Calendar className="w-3.5 h-3.5" /> {activeTab === 'atrasados' ? 'Venceu em:' : 'Vence em:'} {formatDate(item.due_date)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Pago em: {formatDate(item.payment_date || item.paid_at)}
                          </span>
                        )}
                        {activeTab !== 'pagos' && item.customer_phone && (
                          <a
                            href={getWhatsAppLink(item.customer_phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> {item.customer_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {activeTab === 'atrasados' ? 'Valor da Parcela' : activeTab === 'vencendo' ? 'Valor a Vencer' : 'Valor Quitado'}
                      </p>
                      <p className={`text-base font-black ${tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatBRL(activeTab === 'pagos' ? (item.last_amount_paid || item.amount_paid) : item.amount)}
                      </p>
                    </div>
                    {activeTab !== 'pagos' && (
                      <button
                        onClick={() => onOpenPayment(item)}
                        className="bg-brand-green hover:bg-brand-greenHover text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md flex items-center gap-1.5 whitespace-nowrap min-h-[40px]"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span className="hidden sm:inline">REGISTRAR PAGAMENTO</span>
                        <span className="sm:hidden">PAGAMENTO</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
