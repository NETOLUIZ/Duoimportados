import React, { useState, useEffect } from 'react';
import { Shield, Plus, Users, CheckCircle, Ban, Key, RefreshCw, UserCheck } from 'lucide-react';
import api from '../services/api';
import { formatDate, formatPhone, formatBRL } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function SuperAdminPage({ onOpenNewSeller }) {
  const [stats, setStats] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const { switchTargetSeller } = useAuth();

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, sellersRes] = await Promise.all([
        api.get('/super-admin/stats'),
        api.get('/super-admin/sellers')
      ]);
      setStats(statsRes.data);
      setSellers(sellersRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (sellerId, currentStatus, sellerName) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const actionLabel = newStatus === 'BLOCKED' ? 'BLOQUEAR' : 'ATIVAR';

    if (window.confirm(`Deseja realmente ${actionLabel} a conta do vendedor "${sellerName}"?`)) {
      try {
        await api.put(`/super-admin/sellers/${sellerId}/status`, { status: newStatus });
        fetchAdminData();
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao alterar status.');
      }
    }
  };

  const handleResetPassword = async (sellerId, sellerName) => {
    const newPassword = window.prompt(`Digite a NOVA SENHA para o vendedor "${sellerName}":`, '123456');
    if (newPassword && newPassword.trim()) {
      try {
        await api.post(`/super-admin/sellers/${sellerId}/reset-password`, { newPassword: newPassword.trim() });
        alert(`Senha do vendedor "${sellerName}" alterada com sucesso!`);
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao resetar senha.');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 w-full max-w-full">
      {/* Banner */}
      <div className="bg-purple-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" /> Módulo do Super Administrador
          </div>
          <h2 className="text-2xl font-black tracking-tight">Gestão de Contas de Vendedores</h2>
          <p className="text-sm text-purple-200 mt-1">
            Controle de acessos, bloqueio de contas e adição de novos vendedores ao sistema.
          </p>
        </div>

        <button
          onClick={onOpenNewSeller}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center gap-2 shadow-lg shadow-purple-900/50 transition-all text-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ NOVO VENDEDOR</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total de Vendedores</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{stats?.total_sellers || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Cadastrados no sistema</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Vendedores Ativos</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.active_sellers || 0}</p>
            <p className="text-xs text-emerald-600/80 mt-1">Contas liberadas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Contas Bloqueadas</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats?.blocked_sellers || 0}</p>
            <p className="text-xs text-rose-600/80 mt-1">Acesso suspenso</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sellers Table (100% Width Layout) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 font-extrabold text-slate-800 text-base">
          Lista de Vendedores Cadastrados
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Carregando vendedores...</div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-600">Nenhum vendedor cadastrado além do Admin</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200">
                  <th className="p-4 px-6">Vendedor</th>
                  <th className="p-4">Telefone (Login)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Cadastro</th>
                  <th className="p-4 text-center">Clientes</th>
                  <th className="p-4 text-center">Vendas</th>
                  <th className="p-4 text-right px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {sellers.map((s) => {
                  const isActive = s.status === 'ACTIVE';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 px-6 font-bold text-slate-800">
                        {s.name}
                      </td>
                      <td className="p-4 text-slate-700 font-mono font-bold">
                        {formatPhone(s.phone)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                          isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {isActive ? 'ATIVO' : 'BLOQUEADO'}
                        </span>
                      </td>
                      <td className="p-4 text-center text-xs text-slate-500 font-mono">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700">
                        {s.total_customers || 0}
                      </td>
                      <td className="p-4 text-center font-bold text-brand-blue">
                        {s.total_sales || 0}
                      </td>
                      <td className="p-4 text-right px-6 space-x-2 whitespace-nowrap">
                        {/* Switch Context Button */}
                        <button
                          onClick={() => switchTargetSeller(s.id)}
                          title="Acessar dados deste vendedor"
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Ver Dados
                        </button>
                        {/* Toggle Active / Block */}
                        <button
                          onClick={() => handleToggleStatus(s.id, s.status, s.name)}
                          title={isActive ? 'Bloquear vendedor' : 'Ativar vendedor'}
                          className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                            isActive ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(s.id, s.name)}
                          title="Resetar senha"
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                        >
                          <Key className="w-4 h-4" />
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
    </div>
  );
}
