import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Calendar, User, DollarSign, Calculator, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-3 min-h-[44px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5';

export default function NewSaleModal({ isOpen, onClose, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [productName, setProductName] = useState('');
  const [productValue, setProductValue] = useState('');
  const [interestPercent, setInterestPercent] = useState('0'); // Interest rate in percentage %
  const [lateFeePercentPerDay, setLateFeePercentPerDay] = useState('1'); // % per day of delay
  const [paymentMode, setPaymentMode] = useState('MENSAL'); // DIARIA, QUINZENAL, MENSAL
  const [installmentCount, setInstallmentCount] = useState('3');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [saleDate, setSaleDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setLoadingCustomers(true);
      api.get('/customers')
        .then(res => {
          setCustomers(res.data);
          if (res.data.length > 0) {
            setCustomerId(res.data[0].id);
          }
        })
        .catch(err => console.error('Error loading customers:', err))
        .finally(() => setLoadingCustomers(false));

      // Default first due date = 30 days from today or next day for daily
      const defaultDate = new Date();
      defaultDate.setUTCDate(defaultDate.getUTCDate() + 30);
      setFirstDueDate(defaultDate.toISOString().split('T')[0]);
      setSaleDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Mirrors the backend's calculateDueDate logic, purely for the "Data Final" preview
  function addPeriod(dateStr, periods, frequency) {
    if (!dateStr || periods <= 0) return dateStr;
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    if (frequency === 'DIARIA') {
      date.setUTCDate(date.getUTCDate() + periods);
    } else if (frequency === 'QUINZENAL') {
      date.setUTCDate(date.getUTCDate() + periods * 15);
    } else if (frequency === 'MENSAL') {
      const originalDay = date.getUTCDate();
      date.setUTCMonth(date.getUTCMonth() + periods);
      if (date.getUTCDate() !== originalDay) date.setUTCDate(0);
    }
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Real-time summary calculation based on percentage %
  // productValue comes from a type="number" input, which is always period-decimal
  // (e.g. "199.9") — never Brazilian-formatted, so no comma/thousands-dot handling needed.
  const pVal = parseFloat(productValue) || 0;
  const iRate = parseFloat(interestPercent.replace(',', '.')) || 0;
  const lFeeRate = parseFloat(lateFeePercentPerDay.replace(',', '.')) || 1.0;
  const jVal = (pVal * iRate) / 100;
  const totalVal = pVal + jVal;
  const count = parseInt(installmentCount) || 1;
  const installmentVal = count > 0 ? (totalVal / count) : 0;
  const lastDueDate = addPeriod(firstDueDate, count - 1, paymentMode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Por favor, selecione um cliente.');
      return;
    }
    if (pVal <= 0) {
      setError('O valor do produto deve ser maior que zero.');
      return;
    }
    if (!firstDueDate) {
      setError('Informe a data da primeira parcela.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/sales', {
        customer_id: customerId,
        product_name: productName,
        product_value: pVal.toFixed(2),
        interest_value: jVal.toFixed(2),
        interest_percent: iRate,
        late_fee_percent_per_day: lFeeRate,
        payment_mode: paymentMode,
        installment_count: count,
        first_due_date: firstDueDate,
        sale_date: saleDate
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar venda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-modal-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 px-6 flex items-center justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="sale-modal-title" className="text-lg font-bold truncate">Registrar Nova Venda</h3>
              <p className="text-xs text-slate-300">Geração automática de crediário e parcelas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-white w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Form (scrollable) */}
        <form id="new-sale-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Selector */}
          <div>
            <label htmlFor="sale-customer" className={labelClass}>
              <User className="w-4 h-4 text-brand-blue" />
              Cliente *
            </label>
            {loadingCustomers ? (
              <div className="p-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl">Carregando clientes...</div>
            ) : customers.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-sm rounded-xl font-medium">
                Nenhum cliente cadastrado. Cadastre um cliente antes de realizar uma venda.
              </div>
            ) : (
              <select
                id="sale-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className={`${inputClass} font-semibold`}
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} - {c.city || 'Sem cidade'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product & Product Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sale-product" className={labelClass}>Produto Vendido (Opcional)</label>
              <input
                id="sale-product"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: iPhone 15, Perfume, Relógio..."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="sale-value" className={labelClass}>
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Valor do Produto (R$) *
              </label>
              <input
                id="sale-value"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={productValue}
                onChange={(e) => setProductValue(e.target.value)}
                placeholder="0.00"
                required
                className={`${inputClass} text-base font-bold text-emerald-700 dark:text-emerald-400`}
              />
            </div>
          </div>

          {/* Interest & Frequency */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="sale-interest" className={labelClass}>
                <span>Juros (%)</span>
              </label>
              <div className="relative">
                <input
                  id="sale-interest"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max="100"
                  value={interestPercent}
                  onChange={(e) => setInterestPercent(e.target.value)}
                  placeholder="0"
                  className={`${inputClass} pr-7 font-bold text-amber-700 dark:text-amber-400`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-xs">%</span>
              </div>
            </div>

            <div>
              <label htmlFor="sale-late-fee" className={labelClass}>
                <span>Atraso (%/dia)</span>
              </label>
              <div className="relative">
                <input
                  id="sale-late-fee"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max="20"
                  value={lateFeePercentPerDay}
                  onChange={(e) => setLateFeePercentPerDay(e.target.value)}
                  placeholder="1.0"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 text-sm rounded-xl p-3 min-h-[44px] pr-10 font-bold focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-500 dark:text-rose-400 font-extrabold text-[11px]">%/dia</span>
              </div>
            </div>

            <div>
              <label htmlFor="sale-mode" className={labelClass}>Modalidade *</label>
              <select
                id="sale-mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className={`${inputClass} font-semibold`}
              >
                <option value="DIARIA">DIÁRIA</option>
                <option value="QUINZENAL">QUINZENAL</option>
                <option value="MENSAL">MENSAL</option>
              </select>
            </div>

            <div>
              <label htmlFor="sale-installments" className={labelClass}>Parcelas *</label>
              <input
                id="sale-installments"
                type="number"
                inputMode="numeric"
                min="1"
                max="60"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
                required
                className={`${inputClass} font-bold text-center`}
              />
            </div>
          </div>

          {/* Sale Start Date & First Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sale-date" className={labelClass}>
                <Calendar className="w-4 h-4 text-brand-blue" />
                Data Inicial (Venda) *
              </label>
              <input
                id="sale-date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className={`${inputClass} font-semibold`}
              />
            </div>

            <div>
              <label htmlFor="sale-due-date" className={labelClass}>
                <Calendar className="w-4 h-4 text-amber-600" />
                Data do 1º Vencimento *
              </label>
              <input
                id="sale-due-date"
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                required
                className={`${inputClass} font-semibold`}
              />
            </div>
          </div>

          {/* RESUMO PRÉ-CONFIRMAÇÃO */}
          <div className="bg-slate-900 dark:bg-black/40 text-white rounded-2xl p-5 border border-slate-800 dark:border-slate-700 shadow-inner space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-brand-blue font-bold text-xs uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              <span>Resumo da Venda</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Produto:</p>
                <p className="font-semibold text-slate-200">{formatBRL(pVal)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Juros ({iRate}%):</p>
                <p className="font-semibold text-amber-400">{formatBRL(jVal)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Total da Venda:</p>
                <p className="font-bold text-emerald-400 text-base">{formatBRL(totalVal)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Parcelas:</p>
                <p className="font-semibold text-slate-200">{count}x ({paymentMode})</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Valor da Parcela:</p>
                <p className="font-bold text-brand-blue text-base">{formatBRL(installmentVal)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Primeiro Vencimento:</p>
                <p className="font-semibold text-slate-200">{formatDate(firstDueDate)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Data Final (Última Parcela):</p>
                <p className="font-semibold text-slate-200">{formatDate(lastDueDate)}</p>
              </div>
            </div>
          </div>
        </form>

        {/* Buttons (sticky footer) */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 pb-safe flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-sale-form"
            disabled={submitting || customers.length === 0}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Gerando Parcelas...' : 'CONFIRMAR VENDA'}
          </button>
        </div>
      </div>
    </div>
  );
}
