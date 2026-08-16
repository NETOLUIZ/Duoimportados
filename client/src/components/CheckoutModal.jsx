import React, { useState, useEffect } from 'react';
import {
  X, ShoppingCart, Calendar, User, DollarSign, Calculator, AlertCircle,
  UserPlus, Search, UserSearch, ArrowLeft, ArrowRight, CheckCircle2, Phone
} from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate, formatPhone } from '../utils/formatters';

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-3 min-h-[44px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5';

const emptyCustomerForm = {
  name: '', phone: '', cep: '', address: '', number: '', complement: '',
  neighborhood: '', city: '', state: 'CE', referred_by: '', notes: ''
};

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

export default function CheckoutModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // --- Step 1: find or create customer ---
  const [mode, setMode] = useState('search'); // 'search' | 'create'
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // --- Step 2: sale details ---
  const [productName, setProductName] = useState('');
  const [productValue, setProductValue] = useState('');
  const [interestPercent, setInterestPercent] = useState('0');
  const [lateFeePercentPerDay, setLateFeePercentPerDay] = useState('0');
  const [paymentMode, setPaymentMode] = useState('MENSAL');
  const [installmentCount, setInstallmentCount] = useState('3');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
      setMode('search');
      setSearch('');
      setSearchResults([]);
      setSelectedCustomer(null);
      setCustomerForm(emptyCustomerForm);

      setProductName('');
      setProductValue('');
      setInterestPercent('0');
      setLateFeePercentPerDay('0');
      setPaymentMode('MENSAL');
      setInstallmentCount('3');

      const defaultDate = new Date();
      defaultDate.setUTCDate(defaultDate.getUTCDate() + 30);
      setFirstDueDate(defaultDate.toISOString().split('T')[0]);
      setSaleDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== 'search') return;
    const term = search.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      api.get(`/customers?search=${encodeURIComponent(term)}`)
        .then(res => setSearchResults(res.data || []))
        .catch(err => console.error('Error searching customers:', err))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, mode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCustomerFieldChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePickExisting = (c) => {
    setSelectedCustomer(c);
    setError('');
    setStep(2);
  };

  const handleCreateAndContinue = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerForm.name.trim()) {
      setError('Por favor, informe o nome do cliente.');
      return;
    }

    try {
      setSavingCustomer(true);
      const res = await api.post('/customers', customerForm);
      setSelectedCustomer({ id: res.data.id, name: customerForm.name, phone: customerForm.phone });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cadastrar cliente.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setError('');
  };

  // Real-time sale summary calculation
  const pVal = parseFloat(productValue) || 0;
  const iRate = parseFloat(interestPercent.replace(',', '.')) || 0;
  // NOT "|| 0" — that would also override a deliberately-typed "0" back to
  // the fallback, since the number 0 is falsy in JS. Only NaN (empty/invalid
  // input) should fall back; an explicit 0 must stay 0 (no late fee at all).
  const parsedLateFee = parseFloat(lateFeePercentPerDay.replace(',', '.'));
  const lFeeRate = isNaN(parsedLateFee) ? 0 : parsedLateFee;
  const jVal = (pVal * iRate) / 100;
  const totalVal = pVal + jVal;
  const count = parseInt(installmentCount) || 1;
  const installmentVal = count > 0 ? (totalVal / count) : 0;
  const lastDueDate = addPeriod(firstDueDate, count - 1, paymentMode);

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomer?.id) {
      setError('Selecione ou cadastre um cliente primeiro.');
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
      setSubmittingSale(true);
      await api.post('/sales', {
        customer_id: Number(selectedCustomer.id),
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
      setSubmittingSale(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
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
              <h3 id="checkout-modal-title" className="text-lg font-bold truncate">Novo Checkout</h3>
              <p className="text-xs text-slate-300">Etapa {step} de 2 — {step === 1 ? 'Cliente' : 'Venda'}</p>
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

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pt-4 flex-shrink-0">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-brand-blue' : 'bg-slate-200 dark:bg-slate-700'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-brand-blue' : 'bg-slate-200 dark:bg-slate-700'}`} />
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <>
              {/* Mode toggle: search existing vs create new */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('search')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-sm font-bold border transition-all ${
                    mode === 'search'
                      ? 'bg-brand-blue border-brand-blue text-white shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Cliente Existente
                </button>
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl text-sm font-bold border transition-all ${
                    mode === 'create'
                      ? 'bg-brand-blue border-brand-blue text-white shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Novo Cliente
                </button>
              </div>

              {mode === 'search' ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="checkout-search" className={labelClass}>
                      <Search className="w-4 h-4 text-brand-blue" />
                      Buscar por nome ou telefone
                    </label>
                    <input
                      id="checkout-search"
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Digite pelo menos 2 letras..."
                      autoFocus
                      className={`${inputClass} font-semibold`}
                    />
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searching && (
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Buscando...</p>
                    )}
                    {!searching && search.trim().length >= 2 && searchResults.length === 0 && (
                      <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm space-y-1">
                        <p>Nenhum cliente encontrado.</p>
                        <button
                          type="button"
                          onClick={() => { setMode('create'); setCustomerForm(prev => ({ ...prev, name: search.trim() })); }}
                          className="text-brand-blue font-bold hover:underline"
                        >
                          Cadastrar "{search.trim()}" como novo cliente
                        </button>
                      </div>
                    )}
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handlePickExisting(c)}
                        className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-blue hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {formatPhone ? formatPhone(c.phone) : (c.phone || 'Sem telefone')}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <form id="checkout-customer-form" onSubmit={handleCreateAndContinue} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="checkout-customer-name" className={labelClass}>Nome do Cliente *</label>
                      <input
                        id="checkout-customer-name"
                        type="text"
                        name="name"
                        value={customerForm.name}
                        onChange={handleCustomerFieldChange}
                        placeholder="Ex: João da Silva"
                        required
                        className={`${inputClass} font-semibold`}
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-customer-phone" className={labelClass}>Telefone / WhatsApp (Opcional)</label>
                      <input
                        id="checkout-customer-phone"
                        type="tel"
                        inputMode="tel"
                        name="phone"
                        value={customerForm.phone}
                        onChange={handleCustomerFieldChange}
                        placeholder="(11) 99999-9999"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="checkout-customer-cep" className={labelClass}>CEP (Opcional)</label>
                      <input
                        id="checkout-customer-cep"
                        type="text"
                        inputMode="numeric"
                        name="cep"
                        value={customerForm.cep}
                        onChange={handleCustomerFieldChange}
                        placeholder="00000-000"
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="checkout-customer-address" className={labelClass}>Endereço (Opcional)</label>
                      <input
                        id="checkout-customer-address"
                        type="text"
                        name="address"
                        value={customerForm.address}
                        onChange={handleCustomerFieldChange}
                        placeholder="Rua, Avenida..."
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="checkout-customer-number" className={labelClass}>Número (Opcional)</label>
                      <input
                        id="checkout-customer-number"
                        type="text"
                        name="number"
                        value={customerForm.number}
                        onChange={handleCustomerFieldChange}
                        placeholder="123"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-customer-neighborhood" className={labelClass}>Bairro (Opcional)</label>
                      <input
                        id="checkout-customer-neighborhood"
                        type="text"
                        name="neighborhood"
                        value={customerForm.neighborhood}
                        onChange={handleCustomerFieldChange}
                        placeholder="Centro"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-customer-city" className={labelClass}>Cidade (Opcional)</label>
                      <input
                        id="checkout-customer-city"
                        type="text"
                        name="city"
                        value={customerForm.city}
                        onChange={handleCustomerFieldChange}
                        placeholder="Fortaleza"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="checkout-customer-referred-by" className={labelClass}>
                      <UserSearch className="w-3.5 h-3.5 text-brand-blue" />
                      Indicação (Opcional)
                    </label>
                    <input
                      id="checkout-customer-referred-by"
                      type="text"
                      name="referred_by"
                      value={customerForm.referred_by}
                      onChange={handleCustomerFieldChange}
                      placeholder="Quem indicou este cliente?"
                      className={inputClass}
                    />
                  </div>
                </form>
              )}
            </>
          ) : (
            <>
              {/* Selected customer banner */}
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Cliente selecionado</p>
                    <p className="font-black text-slate-800 dark:text-slate-100 truncate">{selectedCustomer?.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline flex-shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Trocar
                </button>
              </div>

              <form id="checkout-sale-form" onSubmit={handleSubmitSale} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-sale-product" className={labelClass}>Produto Vendido (Opcional)</label>
                    <input
                      id="checkout-sale-product"
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Ex: iPhone 15, Perfume, Relógio..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-sale-value" className={labelClass}>
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Valor do Produto (R$) *
                    </label>
                    <input
                      id="checkout-sale-value"
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="checkout-sale-interest" className={labelClass}>
                      <span>Juros (%)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="checkout-sale-interest"
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
                    <label htmlFor="checkout-sale-late-fee" className={labelClass}>
                      <span>Atraso (%/dia)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="checkout-sale-late-fee"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        max="20"
                        value={lateFeePercentPerDay}
                        onChange={(e) => setLateFeePercentPerDay(e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 text-sm rounded-xl p-3 min-h-[44px] pr-10 font-bold focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-500 dark:text-rose-400 font-extrabold text-[11px]">%/dia</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="checkout-sale-mode" className={labelClass}>Modalidade *</label>
                    <select
                      id="checkout-sale-mode"
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
                    <label htmlFor="checkout-sale-installments" className={labelClass}>Parcelas *</label>
                    <input
                      id="checkout-sale-installments"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-sale-date" className={labelClass}>
                      <Calendar className="w-4 h-4 text-brand-blue" />
                      Data Inicial (Venda) *
                    </label>
                    <input
                      id="checkout-sale-date"
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      required
                      className={`${inputClass} font-semibold`}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-sale-due-date" className={labelClass}>
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Data do 1º Vencimento *
                    </label>
                    <input
                      id="checkout-sale-due-date"
                      type="date"
                      value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)}
                      required
                      className={`${inputClass} font-semibold`}
                    />
                  </div>
                </div>

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
            </>
          )}
        </div>

        {/* Buttons (sticky footer) */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 pb-safe flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              {mode === 'create' && (
                <button
                  type="submit"
                  form="checkout-customer-form"
                  disabled={savingCustomer}
                  className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingCustomer ? 'Cadastrando...' : 'CONTINUAR PARA VENDA'}
                  {!savingCustomer && <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBackToStep1}
                className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                type="submit"
                form="checkout-sale-form"
                disabled={submittingSale}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
              >
                {submittingSale ? 'Gerando Parcelas...' : 'CONFIRMAR VENDA'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
