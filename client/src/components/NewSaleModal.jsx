import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Calendar, User, DollarSign, Calculator, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';

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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time summary calculation based on percentage %
  const pVal = parseFloat(productValue.replace(/\./g, '').replace(',', '.')) || 0;
  const iRate = parseFloat(interestPercent.replace(',', '.')) || 0;
  const lFeeRate = parseFloat(lateFeePercentPerDay.replace(',', '.')) || 1.0;
  const jVal = (pVal * iRate) / 100;
  const totalVal = pVal + jVal;
  const count = parseInt(installmentCount) || 1;
  const installmentVal = count > 0 ? (totalVal / count) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Por favor, selecione um cliente.');
      return;
    }
    if (!productName.trim()) {
      setError('Por favor, informe o nome do produto.');
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
        first_due_date: firstDueDate
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 transform transition-all my-8">
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Registrar Nova Venda</h3>
              <p className="text-xs text-slate-300">Geração automática de crediário e parcelas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-brand-blue" />
              Cliente *
            </label>
            {loadingCustomers ? (
              <div className="p-3 text-sm text-slate-500 bg-slate-100 rounded-xl">Carregando clientes...</div>
            ) : customers.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl font-medium">
                Nenhum cliente cadastrado. Cadastre um cliente antes de realizar uma venda.
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-semibold focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none transition-all"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Produto Vendido *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: iPhone 15, Perfume, Relógio..."
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Valor do Produto (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={productValue}
                onChange={(e) => setProductValue(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-base rounded-xl p-3 font-bold text-emerald-700 focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Interest & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Juros Venda (%)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={interestPercent}
                  onChange={(e) => setInterestPercent(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 pr-7 font-bold text-amber-700 focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
                />
                <span className="absolute right-2.5 top-3 text-slate-400 font-bold text-xs">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Juros Atraso (%/dia)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={lateFeePercentPerDay}
                  onChange={(e) => setLateFeePercentPerDay(e.target.value)}
                  placeholder="1.0"
                  className="w-full bg-slate-50 border border-rose-300 text-rose-700 text-sm rounded-xl p-3 pr-10 font-bold focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
                />
                <span className="absolute right-2 top-3 text-rose-500 font-extrabold text-[11px]">%/dia</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Modalidade *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-semibold focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              >
                <option value="DIARIA">DIÁRIA</option>
                <option value="QUINZENAL">QUINZENAL</option>
                <option value="MENSAL">MENSAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Parcelas *
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-bold text-center focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* First Due Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              Data do 1º Vencimento *
            </label>
            <input
              type="date"
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-semibold focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
            />
          </div>

          {/* RESUMO PRÉ-CONFIRMAÇÃO (Section 6 Requirement) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-inner space-y-3">
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
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || customers.length === 0}
              className="px-6 py-3 rounded-xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Gerando Parcelas...' : 'CONFIRMAR VENDA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
