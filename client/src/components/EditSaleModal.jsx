import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import api from '../services/api';
import { formatBRL } from '../utils/formatters';

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-3 min-h-[44px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1';

export default function EditSaleModal({ isOpen, sale, onClose, onSuccess }) {
  const [productName, setProductName] = useState('');
  const [productValue, setProductValue] = useState('');
  const [interestPercent, setInterestPercent] = useState('0');
  const [lateFeePercentPerDay, setLateFeePercentPerDay] = useState('0');
  const [saleDate, setSaleDate] = useState('');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [markPaidAmount, setMarkPaidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && sale) {
      setError('');
      setProductName(sale.product_name || '');
      setProductValue(String(sale.product_value ?? ''));
      setInterestPercent(String(sale.interest_percent ?? '0'));
      setLateFeePercentPerDay(String(sale.late_fee_percent_per_day ?? '0'));
      setSaleDate((sale.sale_date || '').split('T')[0].split(' ')[0] || '');
      setFirstDueDate((sale.first_due_date || '').split('T')[0].split(' ')[0] || '');
      setMarkPaidAmount('');
    }
  }, [isOpen, sale]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sale) return null;

  const originalProductValue = parseFloat(sale.product_value || 0);
  const enteredProductValue = parseFloat(productValue) || 0;
  const valueReduction = Math.max(0, originalProductValue - enteredProductValue);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!saleDate) {
      setError('Informe a data de início.');
      return;
    }
    if (!firstDueDate) {
      setError('Informe a data final (vencimento).');
      return;
    }
    const val = parseFloat(productValue);
    if (isNaN(val) || val <= 0) {
      setError('O valor do produto deve ser maior que zero.');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/sales/${sale.id}`, {
        product_name: productName,
        product_value: val.toFixed(2),
        interest_percent: parseFloat(interestPercent.replace(',', '.')) || 0,
        late_fee_percent_per_day: parseFloat(lateFeePercentPerDay.replace(',', '.')) || 0,
        sale_date: saleDate,
        first_due_date: firstDueDate,
        mark_paid_amount: markPaidAmount ? (parseFloat(markPaidAmount.replace(',', '.')) || 0).toFixed(2) : '0'
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar venda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-sale-modal-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        <div className="bg-navy-900 text-white p-5 px-6 flex items-center justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="edit-sale-modal-title" className="text-lg font-bold truncate">Editar Venda</h3>
              <p className="text-xs text-slate-300 truncate">{sale.customer_name}</p>
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

        <form id="edit-sale-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-medium">
            Quantidade de parcelas e modalidade não podem ser alteradas aqui. Alterar valor ou datas recria as parcelas do zero — se já havia algum pagamento registrado nesta venda, ele será removido (fica registrado na Auditoria antes de apagar).
          </div>

          <div>
            <label htmlFor="edit-sale-product" className={labelClass}>Produto Vendido</label>
            <input
              id="edit-sale-product"
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: iPhone 15, Perfume, Relógio..."
              className={`${inputClass} font-semibold`}
            />
          </div>

          <div>
            <label htmlFor="edit-sale-value" className={labelClass}>
              <DollarSign className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Valor do Produto (R$) *
            </label>
            <input
              id="edit-sale-value"
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

          {valueReduction > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl space-y-2">
              <p className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                Valor reduzido de {formatBRL(originalProductValue)} para {formatBRL(enteredProductValue)} — diferença de {formatBRL(valueReduction)}.
                Se parte disso já foi recebida do cliente, registre abaixo (os juros passam a incidir só sobre o novo valor).
              </p>
              <div>
                <label htmlFor="edit-sale-mark-paid" className={labelClass}>Já Recebido Nesta Renegociação (R$)</label>
                <div className="flex gap-2">
                  <input
                    id="edit-sale-mark-paid"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max={valueReduction}
                    value={markPaidAmount}
                    onChange={(e) => setMarkPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className={`${inputClass} font-bold text-blue-700 dark:text-blue-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setMarkPaidAmount(valueReduction.toFixed(2))}
                    className="px-3 min-h-[44px] rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold whitespace-nowrap"
                  >
                    Usar diferença
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-sale-date" className={labelClass}>
                <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Data Início *
              </label>
              <input
                id="edit-sale-date"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className={`${inputClass} font-semibold`}
              />
            </div>
            <div>
              <label htmlFor="edit-sale-due-date" className={labelClass}>
                <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Data Final *
              </label>
              <input
                id="edit-sale-due-date"
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
                required
                className={`${inputClass} font-semibold`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-sale-interest" className={labelClass}>Juros (%)</label>
              <div className="relative">
                <input
                  id="edit-sale-interest"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max="100"
                  value={interestPercent}
                  onChange={(e) => setInterestPercent(e.target.value)}
                  className={`${inputClass} pr-7 font-bold text-amber-700 dark:text-amber-400`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-xs">%</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Usado nas próximas renovações de "só juros"</p>
            </div>

            <div>
              <label htmlFor="edit-sale-late-fee" className={labelClass}>Atraso (%/dia)</label>
              <div className="relative">
                <input
                  id="edit-sale-late-fee"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max="20"
                  value={lateFeePercentPerDay}
                  onChange={(e) => setLateFeePercentPerDay(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 text-sm rounded-xl p-3 min-h-[44px] pr-10 font-bold focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-500 dark:text-rose-400 font-extrabold text-[11px]">%/dia</span>
              </div>
            </div>
          </div>
        </form>

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
            form="edit-sale-form"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
          </button>
        </div>
      </div>
    </div>
  );
}
