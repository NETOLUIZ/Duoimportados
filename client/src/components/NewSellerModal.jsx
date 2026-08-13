import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, AlertCircle, Globe } from 'lucide-react';
import api from '../services/api';

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl p-3 min-h-[44px] font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-purple-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1';
const PLATFORM_DOMAIN = 'duoimportados.com.br';

function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[_]+/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

export default function NewSellerModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setName('');
      setPhone('');
      setPassword('123456');
      setSubdomain('');
      setSubdomainEdited(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!subdomainEdited) {
      setSubdomain(slugify(name));
    }
  }, [name, subdomainEdited]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubdomainChange = (e) => {
    setSubdomainEdited(true);
    setSubdomain(slugify(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Informe o nome do vendedor.');
    if (!phone.trim()) return setError('Informe o telefone do vendedor.');
    if (!password || password.length < 4) return setError('A senha deve ter no mínimo 4 caracteres.');

    try {
      setSubmitting(true);
      await api.post('/super-admin/sellers', {
        name: name.trim(),
        phone: phone.trim(),
        password,
        subdomain: subdomain.trim()
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cadastrar vendedor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seller-modal-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-purple-900 text-white p-5 px-6 flex items-center justify-between flex-shrink-0 rounded-t-3xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 id="seller-modal-title" className="text-lg font-bold truncate">Cadastrar Novo Vendedor</h3>
              <p className="text-xs text-purple-200">Criar conta, ambiente isolado e subdomínio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-purple-200 hover:text-white w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form id="seller-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="seller-name" className={labelClass}>Nome Completo do Vendedor *</label>
            <input
              id="seller-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendedor D"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="seller-phone" className={labelClass}>Telefone (Será o Login do Vendedor) *</label>
            <input
              id="seller-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="11988884444"
              required
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label htmlFor="seller-password" className={labelClass}>Senha Inicial de Acesso *</label>
            <input
              id="seller-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456"
              required
              className={`${inputClass} font-mono`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">O vendedor utilizará este telefone e senha para fazer login.</p>
          </div>

          <div>
            <label htmlFor="seller-subdomain" className={`${labelClass} flex items-center gap-1.5`}>
              <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Subdomínio
            </label>
            <input
              id="seller-subdomain"
              type="text"
              value={subdomain}
              onChange={handleSubdomainChange}
              placeholder="vendedor-d"
              className={`${inputClass} font-mono lowercase`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1 flex-wrap">
              Endereço:
              <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                {(subdomain || 'vendedor')}.{PLATFORM_DOMAIN}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Gerado automaticamente pelo nome; edite se quiser outro. Se já existir, um número é adicionado no final.</p>
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
            form="seller-form"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-lg shadow-purple-950/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>{submitting ? 'Cadastrando...' : '+ CRIAR VENDEDOR'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
