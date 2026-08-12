import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Tag, Calendar } from 'lucide-react';
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
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-rose-600" />
            Gestão de Despesas & Custos
          </h2>
          <p className="text-sm text-slate-500">Cadastre compras de mercadorias, combustível, aluguel e despesas operacionais.</p>
        </div>
        <button
          onClick={onOpenNewExpense}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-5 rounded-2xl flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ NOVA DESPESA</span>
        </button>
      </div>

      {/* Summary Banner & Category Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Total de Despesas</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{formatBRL(totalExpenseAmount)}</p>
            <p className="text-xs text-slate-400 mt-1">{expenses.length} lançamentos efetuados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Category Filter */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-brand-blue" />
            Filtrar por Categoria
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === '' ? 'bg-navy-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas Categorias
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat.name ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Table (100% Width Layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Carregando despesas...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <DollarSign className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-600">Nenhuma despesa registrada nesta categoria</p>
            <p className="text-xs">Cadastre novos lançamentos clicando em "+ NOVA DESPESA".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                  <th className="p-4 px-6">Data</th>
                  <th className="p-4">Descrição da Despesa</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4 text-right">Valor (R$)</th>
                  <th className="p-4">Observações</th>
                  <th className="p-4 text-right px-6">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 px-6 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {formatDate(e.expense_date)}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {e.name}
                    </td>
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {e.category_name}
                      </span>
                    </td>
                    <td className="p-4 text-right font-black text-rose-600">
                      {formatBRL(e.amount)}
                    </td>
                    <td className="p-4 text-slate-500 text-xs italic">
                      {e.notes || '-'}
                    </td>
                    <td className="p-4 text-right px-6">
                      <button
                        onClick={() => handleDelete(e.id, e.name)}
                        title="Excluir despesa"
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
