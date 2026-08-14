import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, UserSearch } from 'lucide-react';
import api from '../services/api';

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-3 min-h-[44px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-brand-blue focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1';

export default function CustomerModal({ isOpen, customer, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'CE',
    referred_by: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (customer) {
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          cep: customer.cep || '',
          address: customer.address || '',
          number: customer.number || '',
          complement: customer.complement || '',
          neighborhood: customer.neighborhood || '',
          city: customer.city || '',
          state: customer.state || 'CE',
          referred_by: customer.referred_by || '',
          notes: customer.notes || ''
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          cep: '',
          address: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: 'CE',
          referred_by: '',
          notes: ''
        });
      }
    }
  }, [isOpen, customer]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Por favor, informe o nome do cliente.');
      return;
    }

    try {
      setSubmitting(true);
      if (customer) {
        await api.put(`/customers/${customer.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-2xl w-full sm:w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-navy-900 text-white p-5 px-6 flex items-center justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="customer-modal-title" className="text-lg font-bold truncate">
                {customer ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <p className="text-xs text-slate-300">Apenas o nome é obrigatório</p>
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

        {/* Form Body (scrollable) */}
        <form id="customer-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customer-name" className={labelClass}>Nome do Cliente *</label>
              <input
                id="customer-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: João da Silva"
                required
                className={`${inputClass} font-semibold`}
              />
            </div>

            <div>
              <label htmlFor="customer-phone" className={labelClass}>Telefone / WhatsApp (Opcional)</label>
              <input
                id="customer-phone"
                type="tel"
                inputMode="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="customer-cep" className={labelClass}>CEP (Opcional)</label>
              <input
                id="customer-cep"
                type="text"
                inputMode="numeric"
                name="cep"
                value={formData.cep}
                onChange={handleChange}
                placeholder="00000-000"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="customer-address" className={labelClass}>Endereço (Opcional)</label>
              <input
                id="customer-address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Rua, Avenida..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="customer-number" className={labelClass}>Número (Opcional)</label>
              <input
                id="customer-number"
                type="text"
                name="number"
                value={formData.number}
                onChange={handleChange}
                placeholder="123"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="customer-complement" className={labelClass}>Complemento (Opcional)</label>
              <input
                id="customer-complement"
                type="text"
                name="complement"
                value={formData.complement}
                onChange={handleChange}
                placeholder="Apto 42, Bloco B"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="customer-neighborhood" className={labelClass}>Bairro (Opcional)</label>
              <input
                id="customer-neighborhood"
                type="text"
                name="neighborhood"
                value={formData.neighborhood}
                onChange={handleChange}
                placeholder="Centro"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="customer-city" className={labelClass}>Cidade (Opcional)</label>
            <input
              id="customer-city"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="São Paulo"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="customer-referred-by" className={`${labelClass} flex items-center gap-1.5`}>
              <UserSearch className="w-3.5 h-3.5 text-brand-blue" />
              Indicação (Opcional)
            </label>
            <input
              id="customer-referred-by"
              type="text"
              name="referred_by"
              value={formData.referred_by}
              onChange={handleChange}
              placeholder="Quem indicou este cliente?"
              className={inputClass}
            />
          </div>
        </form>

        {/* Action Buttons (sticky footer) */}
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
            form="customer-form"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-sm shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50"
          >
            {submitting ? 'Salvando...' : (customer ? 'ATUALIZAR CLIENTE' : 'SALVAR CADASTRO')}
          </button>
        </div>
      </div>
    </div>
  );
}
