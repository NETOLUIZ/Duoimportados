import React, { useState, useEffect } from 'react';
import { Shield, Plus, Users, CheckCircle, Ban, Key, UserCheck, Globe, Copy, Check, Trash2 } from 'lucide-react';
import api from '../services/api';
import { formatDate, formatPhone } from '../utils/formatters';

export default function SuperAdminPage({ onOpenNewSeller }) {
  const [stats, setStats] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyUrl = (sellerId, url) => {
    if (!url) return;
    navigator.clipboard.writeText(`https://${url}`).then(() => {
      setCopiedId(sellerId);
      setTimeout(() => setCopiedId((prev) => (prev === sellerId ? null : prev)), 1500);
    }).catch(() => {});
  };

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
        await api.put(`/super-admin/sellers/${sellerId}/reset-password`, { new_password: newPassword.trim() });
        alert(`Senha do vendedor "${sellerName}" alterada com sucesso!`);
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao resetar senha.');
      }
    }
  };

  const handleDeleteSeller = async (sellerId, sellerName) => {
    if (window.confirm(`Deseja realmente EXCLUIR DEFINITIVAMENTE o vendedor "${sellerName}"?\n\nEsta ação apagará a conta e TODOS os clientes, vendas e dados vinculados a este vendedor. Esta ação não poderá ser desfeita.`)) {
      try {
        await api.delete(`/super-admin/sellers/${sellerId}`);
        alert(`Vendedor "${sellerName}" excluído com sucesso.`);
        fetchAdminData();
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao excluir vendedor.');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 w-full max-w-full">
      {/* Banner */}
      <div className="bg-purple-950 text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" /> Módulo do Super Administrador
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Gestão de Contas de Vendedores</h2>
          <p className="text-sm text-purple-200 mt-1">
            Controle de acessos, bloqueio de contas e adição de novos vendedores ao sistema.
          </p>
        </div>

        <button
          onClick={onOpenNewSeller}
          className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 px-6 min-h-[48px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 transition-all text-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>NOVO VENDEDOR</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total de Vendedores</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats?.total_sellers || 0}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Cadastrados no sistema</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Vendedores Ativos</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats?.active_sellers || 0}</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-1">Contas liberadas</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-500/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Contas Bloqueadas</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats?.blocked_sellers || 0}</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-1">Acesso suspenso</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Sellers List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 font-extrabold text-slate-800 dark:text-slate-100 text-base">
          Lista de Vendedores Cadastrados
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Carregando vendedores...</div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhum vendedor cadastrado além do Admin</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {sellers.map((s) => {
                const isActive = s.status === 'ACTIVE';
                return (
                  <div key={s.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{s.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{formatPhone(s.phone)}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black flex-shrink-0 ${
                        isActive ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                      }`}>
                        {isActive ? 'ATIVO' : 'BLOQUEADO'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>Clientes: <span className="font-bold text-slate-700 dark:text-slate-300">{s.total_customers || 0}</span></span>
                      <span>Vendas: <span className="font-bold text-brand-blue">{s.total_sales || 0}</span></span>
                      <span>Desde: {formatDate(s.created_at)}</span>
                    </div>

                    {s.subdomain_url && (
                      <button
                        onClick={() => handleCopyUrl(s.id, s.subdomain_url)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 min-h-[40px] rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-left"
                      >
                        <span className="flex items-center gap-1.5 min-w-0 text-xs font-mono font-bold text-purple-700 dark:text-purple-400 truncate">
                          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                          {s.subdomain_url}
                        </span>
                        {copiedId === s.id ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Copy className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                        )}
                      </button>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleToggleStatus(s.id, s.status, s.name)}
                        aria-label={isActive ? `Bloquear ${s.name}` : `Ativar ${s.name}`}
                        title={isActive ? 'Bloquear vendedor' : 'Ativar vendedor'}
                        className={`px-3 min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${
                          isActive ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        <span>{isActive ? 'Bloquear' : 'Ativar'}</span>
                      </button>
                      <button
                        onClick={() => handleResetPassword(s.id, s.name)}
                        aria-label={`Resetar senha de ${s.name}`}
                        title="Resetar senha"
                        className="px-3 min-h-[40px] flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                      >
                        <Key className="w-4 h-4" />
                        <span>Senha</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSeller(s.id, s.name)}
                        aria-label={`Excluir vendedor ${s.name}`}
                        title="Excluir vendedor permanentemente"
                        className="px-3 min-h-[40px] flex items-center justify-center gap-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-extrabold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 px-6">Vendedor</th>
                    <th className="p-4">Telefone (Login)</th>
                    <th className="p-4">Subdomínio</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Cadastro</th>
                    <th className="p-4 text-center">Clientes</th>
                    <th className="p-4 text-center">Vendas</th>
                    <th className="p-4 text-right px-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-medium">
                  {sellers.map((s) => {
                    const isActive = s.status === 'ACTIVE';

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 px-6 font-bold text-slate-800 dark:text-slate-100">
                          {s.name}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-mono font-bold">
                          {formatPhone(s.phone)}
                        </td>
                        <td className="p-4">
                          {s.subdomain_url ? (
                            <button
                              onClick={() => handleCopyUrl(s.id, s.subdomain_url)}
                              title="Copiar endereço"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-xs font-mono font-bold text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors whitespace-nowrap"
                            >
                              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                              {s.subdomain_url}
                              {copiedId === s.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs italic">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                            isActive ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                          }`}>
                            {isActive ? 'ATIVO' : 'BLOQUEADO'}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {formatDate(s.created_at)}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {s.total_customers || 0}
                        </td>
                        <td className="p-4 text-center font-bold text-brand-blue">
                          {s.total_sales || 0}
                        </td>
                        <td className="p-4 text-right px-6 space-x-2 whitespace-nowrap">
                          {/* Toggle Active / Block */}
                          <button
                            onClick={() => handleToggleStatus(s.id, s.status, s.name)}
                            title={isActive ? 'Bloquear vendedor' : 'Ativar vendedor'}
                            aria-label={isActive ? `Bloquear ${s.name}` : `Ativar ${s.name}`}
                            className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                              isActive ? 'bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(s.id, s.name)}
                            title="Resetar senha"
                            aria-label={`Resetar senha de ${s.name}`}
                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {/* Delete Seller */}
                          <button
                            onClick={() => handleDeleteSeller(s.id, s.name)}
                            title="Excluir vendedor permanentemente"
                            aria-label={`Excluir vendedor ${s.name}`}
                            className="p-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl transition-colors"
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
          </>
        )}
      </div>
    </div>
  );
}
