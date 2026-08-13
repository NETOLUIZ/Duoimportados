import React, { useEffect, useState } from 'react';
import { LogOut, UserCheck, Shield, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ThemeToggle from './ThemeToggle';

export default function Topbar({ onOpenSidebar }) {
  const { user, logout, isSuperAdmin, activeSellerId, switchTargetSeller } = useAuth();
  const [sellersList, setSellersList] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/super-admin/sellers')
        .then(res => setSellersList(res.data))
        .catch(err => console.error('Error fetching sellers for topbar:', err));
    }
  }, [isSuperAdmin]);

  return (
    <header className="min-h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-sm pt-safe">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          aria-label="Abrir menu"
          className="lg:hidden w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
          <span className="hidden sm:inline">Painel de Controle Financeiro</span>
          <span className="sm:hidden">Painel Financeiro</span>
        </h2>
        {isSuperAdmin && (
          <span className="hidden md:flex bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-500/30 items-center gap-1 flex-shrink-0">
            <Shield className="w-3.5 h-3.5" /> Super Admin
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

        <ThemeToggle />

        {/* Current User Info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{user?.phone}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Sair do sistema"
            title="Sair do sistema"
            className="w-11 h-11 sm:w-auto sm:h-auto sm:py-2 sm:px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1.5 font-medium text-xs border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
