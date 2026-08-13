import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Tag } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';

export default function ExpensesPage({ onOpenNewExpense }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const url = selectedCategory
        ? `/expenses?category=${encodeURIComponent(selectedCategory)}`
        : '/expenses';
      const [expRes, catRes] = await Promise.all([
        api.get(url),
        api.get('/expenses/categories')
      ]);
      setExpenses(expRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Excluir a despesa "${name}"?`)) {
      try {
        await api.delete(`/expenses/${id}`);
        fetchExpenses();
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao excluir despesa.');
      }
    }
  };

  const totalExpenseAmount = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-rose-600 dark:text-rose-400" />
            Gestão de Despesas & Custos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Cadastre compras de mercadorias, combustível, aluguel e despesas operacionais.</p>
        </div>
        <button
          onClick={onOpenNewExpense}
          className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-5 min-h-[44px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-all text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>NOVA DESPESA</span>
        </button>
      </div>

      {/* Summary Banner & Category Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total de Despesas</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{formatBRL(totalExpenseAmount)}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{expenses.length} lançamentos efetuados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Category Filter */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-brand-blue" />
            Filtrar por Categoria
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
                selectedCategory === '' ? 'bg-navy-900 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas Categorias
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat.name ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Carregando despesas...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <DollarSign className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhuma despesa registrada nesta categoria</p>
            <p className="text-xs">Cadastre novos lançamentos clicando em "NOVA DESPESA".</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((e) => (
                <div key={e.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{e.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{formatDate(e.expense_date)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(e.id, e.name)}
                      aria-label={`Excluir despesa ${e.name}`}
                      className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                      {e.category_name}
                    </span>
                    <span className="font-black text-rose-600 dark:text-rose-400">{formatBRL(e.amount)}</span>
                  </div>
                  {e.notes && <p className="text-xs text-slate-500 dark:text-slate-400 italic">{e.notes}</p>}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 px-6">Data</th>
                    <th className="p-4">Descrição da Despesa</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4 text-right">Valor (R$)</th>
                    <th className="p-4">Observações</th>
                    <th className="p-4 text-right px-6">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 px-6 text-slate-600 dark:text-slate-300 font-mono text-xs whitespace-nowrap">
                        {formatDate(e.expense_date)}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                        {e.name}
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                          {e.category_name}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-rose-600 dark:text-rose-400">
                        {formatBRL(e.amount)}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 text-xs italic">
                        {e.notes || '-'}
                      </td>
                      <td className="p-4 text-right px-6">
                        <button
                          onClick={() => handleDelete(e.id, e.name)}
                          title="Excluir despesa"
                          aria-label={`Excluir despesa ${e.name}`}
                          className="p-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
