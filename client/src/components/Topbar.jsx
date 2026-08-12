import React, { useEffect, useState } from 'react';
import { LogOut, UserCheck, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Topbar() {
  const { user, logout, isSuperAdmin, activeSellerId, switchTargetSeller } = useAuth();
  const [sellersList, setSellersList] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/super-admin/sellers')
        .then(res => setSellersList(res.data))
        .catch(err => console.error('Error fetching sellers for topbar:', err));
    }
  }, [isSuperAdmin]);

  const currentSeller = sellersList.find(s => String(s.id) === String(activeSellerId));

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">
          Painel de Controle Financeiro
        </h2>
        {isSuperAdmin && (
          <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Super Admin
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Super Admin Seller Context Switcher */}
        {isSuperAdmin && sellersList.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-700">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Visualizando Vendedor:</span>
            <select
              value={activeSellerId || ''}
              onChange={(e) => switchTargetSeller(e.target.value || null)}
              aria-label="Selecionar Vendedor para visualizar dados"
              className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="">(Minha própria conta Admin)</option>
              {sellersList.map(seller => (
                <option key={seller.id} value={seller.id}>
                  {seller.name} ({seller.phone})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current User Info & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 leading-none">{user?.name}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.phone}</p>
          </div>
          <button
            onClick={logout}
            title="Sair do sistema"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 font-medium text-xs border border-transparent hover:border-rose-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
