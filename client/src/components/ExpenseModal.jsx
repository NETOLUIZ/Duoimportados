import React, { useState, useEffect } from 'react';
import { X, DollarSign, Tag, AlertCircle } from 'lucide-react';
import api from '../services/api';

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-3 min-h-[44px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1';

export default function ExpenseModal({ isOpen, onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState('Compra de mercadoria');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setName('');
      setAmount('');
      setNotes('');
      setExpenseDate(new Date().toISOString().split('T')[0]);

      api.get('/expenses/categories')
        .then(res => {
          setCategories(res.data);
          if (res.data.length > 0) {
            setCategoryName(res.data[0].name);
          }
        })
        .catch(err => console.error('Error fetching categories:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor, informe a descrição da despesa.');
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('O valor da despesa deve ser maior que zero.');
      return;
    }

    const finalCategory = isCustomCat ? customCategory.trim() : categoryName;
    if (!finalCategory) {
      setError('Por favor, selecione ou informe uma categoria.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/expenses', {
        name,
        amount: val.toFixed(2),
        category_name: finalCategory,
        expense_date: expenseDate,
        notes
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar despesa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-rose-600 text-white p-5 px-6 flex items-center justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="expense-modal-title" className="text-lg font-bold truncate">Registrar Nova Despesa</h3>
              <p className="text-xs text-rose-100">Controle de custos operacionais e compras</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-rose-100 hover:text-white w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form id="expense-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="expense-name" className={labelClass}>Nome da Despesa *</label>
            <input
              id="expense-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Compra de estoque, Combustível, Internet..."
              required
              className={`${inputClass} font-semibold`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-amount" className={labelClass}>Valor (R$) *</label>
              <input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className={`${inputClass} text-lg font-bold text-rose-600 dark:text-rose-400`}
              />
            </div>

            <div>
              <label htmlFor="expense-date" className={labelClass}>Data *</label>
              <input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className={`${inputClass} font-semibold`}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Categoria *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCat(!isCustomCat)}
                className="text-xs text-brand-blue font-semibold hover:underline min-h-[32px] px-1"
              >
                {isCustomCat ? 'Selecionar existente' : '+ Nova Categoria'}
              </button>
            </div>

            {isCustomCat ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Digite a nova categoria..."
                className={inputClass}
              />
            ) : (
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className={`${inputClass} font-semibold`}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="expense-notes" className={labelClass}>Observações (Opcional)</label>
            <input
              id="expense-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais..."
              className={inputClass}
            />
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
            form="expense-form"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : '+ REGISTRAR DESPESA'}
          </button>
        </div>
      </div>
    </div>
  );
}
