import React, { useState, useEffect } from 'react';
import { X, DollarSign, Tag, AlertCircle } from 'lucide-react';
import api from '../services/api';

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 transform transition-all my-8">
        {/* Header */}
        <div className="bg-rose-600 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Registrar Nova Despesa</h3>
              <p className="text-xs text-rose-100">Controle de custos operacionais e compras</p>
            </div>
          </div>
          <button onClick={onClose} className="text-rose-100 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nome da Despesa *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Compra de estoque, Combustível, Internet..."
              required
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-semibold focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Valor (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-lg font-bold rounded-xl p-3 text-rose-600 focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data *
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-semibold focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Categoria *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCat(!isCustomCat)}
                className="text-xs text-brand-blue font-semibold hover:underline"
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
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
              />
            ) : (
              <select
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-semibold focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
            />
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
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : '+ REGISTRAR DESPESA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
