import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Plus, 
  ShieldCheck,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ onOpenNewSale }) {
  const { user, isSuperAdmin } = useAuth();
  const location = useLocation();

  const menuItems = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Clientes', path: '/customers', icon: Users },
    { label: 'Vendas', path: '/sales', icon: ShoppingCart },
    { label: 'Recebimentos', path: '/installments', icon: CreditCard },
    { label: 'Despesas', path: '/expenses', icon: DollarSign },
    { label: 'Financeiro', path: '/financial', icon: TrendingUp },
    { label: 'Configurações', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 text-white flex flex-col h-screen fixed left-0 top-0 z-30 shadow-xl border-r border-navy-800 transition-all">
      {/* Brand Header */}
      <div className="p-5 border-b border-navy-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center text-white font-bold text-xl shadow-lg">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-wide text-white leading-tight">Crediário VIP</h1>
          <p className="text-xs text-slate-400 font-medium">Gestão de Vendas</p>
        </div>
      </div>

      {/* Prominent Quick Action Button: + NOVA VENDA */}
      <div className="p-4">
        <button
          onClick={onOpenNewSale}
          className="w-full bg-brand-blue hover:bg-brand-blueHover text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 transition-all duration-200 text-sm tracking-wide transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>NOVA VENDA</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-blue text-white shadow-md shadow-blue-950 font-semibold'
                  : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Super Admin Menu item */}
        {isSuperAdmin && (
          <div className="pt-4 mt-4 border-t border-navy-800">
            <div className="px-4 text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">
              Administração
            </div>
            <NavLink
              to="/super-admin"
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                location.pathname === '/super-admin'
                  ? 'bg-purple-600 text-white shadow-md font-semibold'
                  : 'text-purple-300 hover:bg-navy-800 hover:text-purple-100'
              }`}
            >
              <ShieldCheck className="w-5 h-5 text-purple-300" />
              <span>Super Admin</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-200">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user?.name || 'Usuário'}</p>
          <p className="text-xs text-slate-400 truncate font-mono">{user?.phone}</p>
        </div>
      </div>
    </aside>
  );
}
