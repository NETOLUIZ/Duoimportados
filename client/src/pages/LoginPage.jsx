import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Lock, Phone, AlertCircle, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Por favor, informe seu telefone e senha.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(phone, password);
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoPhone, demoPass) => {
    setPhone(demoPhone);
    setPassword(demoPass);
    setError('');
    try {
      setLoading(true);
      const user = await login(demoPhone, demoPass);
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro no login de teste.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 flex items-center justify-center p-4 pt-safe pb-safe">
      <div className="max-w-md w-full">
        {/* Logo Card */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-blue items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-3">
            <Package className="w-9 h-9 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Imports</h1>
          <p className="text-sm text-slate-400 font-medium">Gestão de Vendas, Parcelas e Lucro</p>
        </div>

        {/* Main Login Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Acesse sua conta</h2>

          {error && (
            <div role="alert" className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-brand-blue" />
                Telefone (Login)
              </label>
              <input
                id="login-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 11988881111"
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-3.5 min-h-[48px] font-mono font-semibold focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-brand-blue" />
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-3.5 min-h-[48px] font-mono font-semibold focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 min-h-[52px] rounded-2xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-base shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? 'Entrando...' : 'ENTRAR NO SISTEMA'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
