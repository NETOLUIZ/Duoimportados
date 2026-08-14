import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, RefreshCw, UserCheck, Calendar, Activity, Lock, AlertCircle, Plus, Trash2, Users } from 'lucide-react';
import api from '../services/api';
import { formatDate } from '../utils/formatters';

export default function AuditLogsPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Operators state
  const [operators, setOperators] = useState([]);
  const [showOpModal, setShowOpModal] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [newOpRole, setNewOpRole] = useState('OPERATOR');
  const [opLoading, setOpLoading] = useState(false);
  const [opError, setOpError] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit-logs?search=${encodeURIComponent(search)}`);
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperators = async () => {
    try {
      const res = await api.get('/auth/operators');
      setOperators(res.data);
    } catch (err) {
      console.error('Error fetching operators:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchOperators();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    try {
      setOpLoading(true);
      setOpError('');
      await api.post('/auth/operators', {
        name: newOpName,
        password: newOpPassword,
        role: newOpRole
      });
      setNewOpName('');
      setNewOpPassword('');
      setShowOpModal(false);
      fetchOperators();
      fetchLogs();
    } catch (err) {
      setOpError(err.response?.data?.error || 'Erro ao criar operador.');
    } finally {
      setOpLoading(false);
    }
  };

  const handleDeleteOperator = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja remover o acesso do operador "${name}"?`)) return;
    try {
      await api.delete(`/auth/operators/${id}`);
      fetchOperators();
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover operador.');
    }
  };

  const getBadgeStyle = (action) => {
    if (action.includes('CRIADA') || action.includes('CRIADO')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    }
    if (action.includes('EXCLUIDA') || action.includes('EXCLUIDO')) {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';
    }
    if (action.includes('PAGAMENTO') || action.includes('REGISTRADO')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-full">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-navy-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            Segurança, Equipe & Log de Auditoria
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Gerencie operadores de acesso e acompanhe todas as ações realizadas no sistema com rastreabilidade inalterável.
          </p>
        </div>
        <button
          onClick={() => setShowOpModal(true)}
          className="bg-brand-blue hover:bg-brand-blueHover text-white font-bold py-3 px-5 rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-all text-xs whitespace-nowrap min-h-[44px]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>CADASTRAR NOVO OPERADOR</span>
        </button>
      </div>

      {/* Operadores Ativos Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-blue" />
            Equipe & Operadores Cadastrados ({operators.length})
          </h3>
        </div>

        {operators.length === 0 ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
            Nenhum operador adicional cadastrado. Apenas a conta master possui acesso ao sistema.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {operators.map((op) => (
              <div key={op.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{op.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3" /> Perfil: <span className="font-semibold text-brand-blue">{op.role === 'ADMIN' ? 'Administrador' : 'Operador (Sem botão excluir)'}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteOperator(op.id, op.name)}
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  title="Remover operador"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter and Search Form */}
      <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do usuário, ação ou detalhe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 min-h-[40px]"
        >
          <Search className="w-3.5 h-3.5" />
          BUSCAR LOGS
        </button>
        <button
          type="button"
          onClick={fetchLogs}
          className="w-full sm:w-auto bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 min-h-[40px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          ATUALIZAR
        </button>
      </form>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Histórico Recente de Atividades ({logs.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            Carregando histórico de auditoria...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-semibold">
            Nenhum evento registrado no histórico até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3.5 px-5">Data / Hora</th>
                  <th className="p-3.5">Usuário</th>
                  <th className="p-3.5">Ação</th>
                  <th className="p-3.5 px-5">Detalhes da Operação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  const message = typeof log.details === 'object' ? log.details?.message : log.details;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 px-5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {log.created_at ? log.created_at.replace('T', ' ').substring(0, 19) : '-'}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap">
                        <UserCheck className="w-3.5 h-3.5 text-brand-blue" />
                        {log.user_name}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg border font-extrabold text-[10px] ${getBadgeStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 px-5 text-slate-700 dark:text-slate-300 font-medium leading-relaxed max-w-md">
                        {message || JSON.stringify(log.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Operador */}
      {showOpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-blue" />
              Cadastrar Novo Operador
            </h3>

            {opError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{opError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOperator} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Nome do Operador *</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Clara"
                  value={newOpName}
                  onChange={(e) => setNewOpName(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Senha de Acesso *</label>
                <input
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={newOpPassword}
                  onChange={(e) => setNewOpPassword(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Nível de Permissão</label>
                <select
                  value={newOpRole}
                  onChange={(e) => setNewOpRole(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="OPERATOR">Operador (SEM botão de Excluir)</option>
                  <option value="ADMIN">Administrador (Acesso total)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={opLoading}
                  className="bg-brand-blue hover:bg-brand-blueHover text-white font-bold px-5 py-2.5 rounded-xl shadow-md"
                >
                  {opLoading ? 'SALVANDO...' : 'CRIAR OPERADOR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
