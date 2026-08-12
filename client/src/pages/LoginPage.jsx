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
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo Card */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-blue items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-3">
            <Package className="w-9 h-9 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Crediário VIP</h1>
          <p className="text-sm text-slate-400 font-medium">Gestão de Vendas, Parcelas e Lucro</p>
        </div>

        {/* Main Login Box */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Acesse sua conta</h2>

          {error && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-brand-blue" />
                Telefone (Login)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 11988881111"
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-3.5 font-mono font-semibold focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-brand-blue" />
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-3.5 font-mono font-semibold focus:ring-2 focus:ring-brand-blue focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-brand-blue hover:bg-brand-blueHover text-white font-bold text-base shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? 'Entrando...' : 'ENTRAR NO SISTEMA'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">
              Acesso Rápido de Demonstração
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('11988881111', '123456')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <User className="w-3.5 h-3.5 text-brand-blue" />
                  Vendedor A
                </div>
                <div className="text-[11px] text-slate-500 font-mono">11988881111</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('11988882222', '123456')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Vendedor B
                </div>
                <div className="text-[11px] text-slate-500 font-mono">11988882222</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('11988883333', '123456')}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  Vendedor C
                </div>
                <div className="text-[11px] text-slate-500 font-mono">11988883333</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('11999990000', '123456')}
                className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  Super Admin
                </div>
                <div className="text-[11px] text-purple-700 font-mono">11999990000</div>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">Senha padrão: <span className="font-mono font-bold">123456</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
