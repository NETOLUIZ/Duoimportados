import React, { useState, useEffect, useCallback } from 'react';
import {
  Handshake,
  Calendar,
  Users,
  Percent,
  DollarSign,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';

function currentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function periodLabel(period) {
  if (!period) return '';
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function ReferralsPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [referrers, setReferrers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({}); // key: name.toLowerCase() -> { commission_type, commission_value }
  const [savingKey, setSavingKey] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/referrals?period=${period}`);
      setReferrers(res.data.referrers || []);
      setDrafts((prev) => {
        const next = { ...prev };
        (res.data.referrers || []).forEach((r) => {
          const key = r.name.toLowerCase();
          if (!next[key]) {
            next[key] = {
              commission_type: r.commission_type || 'PERCENTAGE',
              commission_value: r.commission_value != null ? String(r.commission_value) : ''
            };
          }
        });
        return next;
      });
    } catch (err) {
      console.error('Error fetching referrals:', err);
      setError('Erro ao carregar indicações.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const updateDraft = (key, field, value) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSaveConfig = async (referrer) => {
    const key = referrer.name.toLowerCase();
    const draft = drafts[key];
    if (!draft) return;

    try {
      setSavingKey(key);
      setError('');
      await api.put('/referrals/config', {
        name: referrer.name,
        commission_type: draft.commission_type,
        commission_value: draft.commission_value
      });
      await fetchReferrals();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar configuração de indicação.');
    } finally {
      setSavingKey(null);
    }
  };

  const handlePay = async (referrer) => {
    if (!referrer.referrer_id) return;
    if (!window.confirm(`Confirmar pagamento de ${formatBRL(referrer.commission_amount)} para "${referrer.name}" (${periodLabel(period)})? Isso será lançado em Despesas.`)) {
      return;
    }
    try {
      setPayingId(referrer.referrer_id);
      setError('');
      await api.post(`/referrals/${referrer.referrer_id}/pay`, { period });
      await fetchReferrals();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao pagar comissão de indicação.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Handshake className="w-6 h-6 sm:w-7 sm:h-7 text-brand-blue" />
            Indicações
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe quem indicou clientes e pague as comissões do mês.</p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 px-3 shadow-sm w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-brand-blue flex-shrink-0" />
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value || currentPeriod())}
            className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none min-h-[36px] w-full"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Carregando indicações...</div>
      ) : referrers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
          <Handshake className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhuma indicação registrada ainda</p>
          <p className="text-xs max-w-sm mx-auto">Preencha o campo "Indicação" ao cadastrar um cliente para que ele apareça aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {referrers.map((referrer) => {
            const key = referrer.name.toLowerCase();
            const draft = drafts[key] || { commission_type: 'PERCENTAGE', commission_value: '' };
            const isExpanded = expandedKey === key;
            const isSaving = savingKey === key;
            const isPaying = payingId === referrer.referrer_id;
            const commissionAmount = parseFloat(referrer.commission_amount || 0);
            const canPay = !!referrer.referrer_id && !referrer.is_paid && commissionAmount > 0;

            return (
              <div key={key} className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                  {/* Name + referred customers */}
                  <div className="lg:w-64 flex-shrink-0 min-w-0">
                    <p className="font-black text-slate-800 dark:text-slate-100 truncate">{referrer.name}</p>
                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {referrer.customers_count} cliente(s) indicado(s)
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Commission config */}
                  <div className="flex items-end gap-2 flex-wrap">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Tipo
                      </label>
                      <select
                        value={draft.commission_type}
                        onChange={(e) => updateDraft(key, 'commission_type', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-2.5 min-h-[40px] font-semibold focus:ring-2 focus:ring-brand-blue focus:outline-none"
                      >
                        <option value="PERCENTAGE">Porcentagem (%)</option>
                        <option value="FIXED">Valor Fixo (R$)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        {draft.commission_type === 'PERCENTAGE' ? 'Percentual' : 'Valor'}
                      </label>
                      <div className="relative w-32">
                        {draft.commission_type === 'FIXED' && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">R$</span>
                        )}
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={draft.commission_value}
                          onChange={(e) => updateDraft(key, 'commission_value', e.target.value)}
                          placeholder="0"
                          className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-2.5 min-h-[40px] font-bold focus:ring-2 focus:ring-brand-blue focus:outline-none ${draft.commission_type === 'FIXED' ? 'pl-9' : 'pr-7'}`}
                        />
                        {draft.commission_type === 'PERCENTAGE' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm">%</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveConfig(referrer)}
                      disabled={isSaving}
                      aria-label={`Salvar comissão de ${referrer.name}`}
                      title="Salvar configuração"
                      className="min-h-[40px] px-3 flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>

                  {/* Stats + pay action */}
                  <div className="flex items-center justify-between lg:ml-auto gap-4 lg:gap-6 flex-wrap">
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Juros gerados no mês</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatBRL(referrer.base_amount)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Comissão</p>
                      <p className="text-lg font-black text-brand-blue">{formatBRL(referrer.commission_amount)}</p>
                    </div>

                    {referrer.is_paid ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-black bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap">
                        <CheckCircle2 className="w-4 h-4" />
                        Pago em {formatDate(referrer.paid_at)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePay(referrer)}
                        disabled={!canPay || isPaying}
                        title={!referrer.referrer_id ? 'Configure a comissão antes de pagar' : (commissionAmount <= 0 ? 'Nenhuma comissão a pagar neste período' : '')}
                        className="min-h-[40px] px-4 flex items-center justify-center gap-1.5 bg-brand-green hover:bg-brand-greenHover text-white rounded-xl text-xs font-black shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        <DollarSign className="w-4 h-4" />
                        {isPaying ? 'PAGANDO...' : 'MARCAR COMO PAGO'}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      Clientes indicados por {referrer.name}
                    </p>
                    {referrer.customers.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum cliente encontrado.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {referrer.customers.map((c) => (
                          <span key={c.id} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
