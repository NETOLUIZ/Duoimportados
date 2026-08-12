import React, { useState } from 'react';
import { X, UserCheck, Shield, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function NewSellerModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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
        password
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transform transition-all my-8">
        {/* Header */}
        <div className="bg-purple-900 text-white p-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Cadastrar Novo Vendedor</h3>
              <p className="text-xs text-purple-200">Criar conta e ambiente isolado para novo usuário</p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white p-1 rounded-lg">
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
              Nome Completo do Vendedor *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendedor D"
              required
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Telefone (Será o Login do Vendedor) *
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="11988884444"
              required
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-mono font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Senha Inicial de Acesso *
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456"
              required
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 font-mono font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">O vendedor utilizará este telefone e senha para fazer login.</p>
          </div>

          {/* Action Buttons */}
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
              className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm shadow-lg shadow-purple-950/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>{submitting ? 'Cadastrando...' : '+ CRIAR VENDEDOR'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
