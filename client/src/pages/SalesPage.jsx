import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Calendar, User, Trash2, Eye, CheckCircle2, Clock } from 'lucide-react';
import api from '../services/api';
import { formatBRL, formatDate, getFrequencyLabel } from '../utils/formatters';

export default function SalesPage({ onOpenNewSale }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleDeleteSale = async (id, productName) => {
    if (window.confirm(`Excluir a venda "${productName}"? As parcelas vinculadas também serão removidas.`)) {
      try {
        await api.delete(`/sales/${id}`);
        fetchSales();
        if (selectedSale?.sale?.id === id) setSelectedSale(null);
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao excluir venda.');
      }
    }
  };

  const handleViewSale = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      setSelectedSale(res.data);
    } catch (err) {
      console.error('Error loading sale details:', err);
    }
  };

  return (
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-brand-blue" />
            Registro de Vendas
          </h2>
          <p className="text-sm text-slate-500">Histórico completo de vendas e cálculo de parcelamento.</p>
        </div>
        <button
          onClick={onOpenNewSale}
          className="bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-3 px-5 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-900/30 transition-all text-sm"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ NOVA VENDA</span>
        </button>
      </div>

      {/* Sales Table (100% Width Layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Carregando registro de vendas...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ShoppingCart className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-600">Nenhuma venda realizada ainda</p>
            <p className="text-xs">Registre uma nova venda parcelada clicando no botão "+ NOVA VENDA".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                  <th className="p-4 px-6">Data</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Produto</th>
                  <th className="p-4 text-center">Modalidade</th>
                  <th className="p-4 text-right">Valor Produto</th>
                  <th className="p-4 text-right">Juros</th>
                  <th className="p-4 text-right">Total Venda</th>
                  <th className="p-4 text-right">Recebido</th>
                  <th className="p-4 text-right px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {sales.map((s) => {
                  const isFullyPaid = parseFloat(s.remaining_balance) <= 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 px-6 text-slate-600 font-mono text-xs whitespace-nowrap">
                        {formatDate(s.sale_date)}
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {s.customer_name}
                      </td>
                      <td className="p-4 text-slate-700 font-semibold">
                        {s.product_name}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                          {s.installment_count}x {getFrequencyLabel(s.payment_mode)}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-600">
                        {formatBRL(s.product_value)}
                      </td>
                      <td className="p-4 text-right text-amber-600 font-semibold">
                        {formatBRL(s.interest_value)}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">
                        {formatBRL(s.total_value)}
                      </td>
                      <td className="p-4 text-right font-bold">
                        <span className={isFullyPaid ? 'text-emerald-600' : 'text-brand-blue'}>
                          {formatBRL(s.total_paid)}
                        </span>
                      </td>
                      <td className="p-4 text-right px-6 space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleViewSale(s.id)}
                          title="Ver parcelas"
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded-xl transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(s.id, s.product_name)}
                          title="Excluir venda"
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail & Installments Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">{selectedSale.sale.product_name}</h3>
                <p className="text-xs text-slate-500">Cliente: <span className="font-bold text-slate-700">{selectedSale.sale.customer_name}</span> | Data: {formatDate(selectedSale.sale.sale_date)}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold text-xs">
                Fechar
              </button>
            </div>

            {/* Installments Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Parcelas Geradas</h4>
              <div className="space-y-2">
                {selectedSale.installments.map((inst) => (
                  <div key={inst.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-brand-blue mr-2">Parcela {inst.installment_number}</span>
                      <span className="text-xs text-slate-500">Vencimento: {formatDate(inst.due_date)}</span>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="font-black text-slate-800">{formatBRL(inst.amount)}</p>
                        <p className="text-xs text-slate-400">Pago: {formatBRL(inst.amount_paid)}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${inst.status === 'PAGA' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {inst.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
