import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import api from './services/api';
import { playAlertSound } from './utils/sound';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ThemeToggle from './components/ThemeToggle';
import NewSaleModal from './components/NewSaleModal';
import PaymentModal from './components/PaymentModal';
import CustomerModal from './components/CustomerModal';
import ExpenseModal from './components/ExpenseModal';
import NewSellerModal from './components/NewSellerModal';
import OverdueAlertModal from './components/OverdueAlertModal';
import ChangePasswordModal from './components/ChangePasswordModal';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import InstallmentsPage from './pages/InstallmentsPage';
import ExpensesPage from './pages/ExpensesPage';
import ReferralsPage from './pages/ReferralsPage';
import FinancialPage from './pages/FinancialPage';
import SuperAdminPage from './pages/SuperAdminPage';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isNewSellerOpen, setIsNewSellerOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const [overdueAlert, setOverdueAlert] = useState({ items: [], total: 0 });
  const [isOverdueAlertOpen, setIsOverdueAlertOpen] = useState(false);

  // Close mobile sidebar automatically when the route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Check for overdue installments once per login and alert with sound
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem('overdue_alert_shown') === '1') return;
    sessionStorage.setItem('overdue_alert_shown', '1');

    api.get('/dashboard/alerts')
      .then((res) => {
        const atrasados = res.data?.atrasados || [];
        if (atrasados.length > 0) {
          const total = atrasados.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
          setOverdueAlert({ items: atrasados, total });
          setIsOverdueAlertOpen(true);
          playAlertSound();
        }
      })
      .catch((err) => console.error('Error checking overdue installments:', err));
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Iniciando Imports...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleOpenPayment = (installment) => {
    setSelectedInstallment(installment);
    setIsPaymentOpen(true);
  };

  const handleOpenCustomer = (customerToEdit = null) => {
    setSelectedCustomer(customerToEdit);
    setIsCustomerOpen(true);
  };

  const triggerGlobalRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas dark:bg-slate-950">
      {/* 1. Responsive Sidebar (drawer on mobile, fixed on desktop) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenNewSale={() => setIsNewSaleOpen(true)}
      />

      {/* 2. Main Content Canvas (Flexible 100% Width & Height) */}
      <div className="flex-1 flex flex-col lg:pl-64 h-screen overflow-y-auto w-full">
        <Topbar onOpenSidebar={() => setIsSidebarOpen(true)} />

        <main className="flex-1 pb-12">
          <Routes key={refreshKey}>
            <Route
              path="/"
              element={
                <DashboardPage
                  onOpenNewSale={() => setIsNewSaleOpen(true)}
                  onOpenPayment={handleOpenPayment}
                />
              }
            />
            <Route
              path="/customers"
              element={
                <CustomersPage
                  onOpenNewCustomer={() => handleOpenCustomer(null)}
                  onEditCustomer={(c) => handleOpenCustomer(c)}
                />
              }
            />
            <Route
              path="/sales"
              element={
                <SalesPage
                  onOpenNewSale={() => setIsNewSaleOpen(true)}
                />
              }
            />
            <Route
              path="/installments"
              element={
                <InstallmentsPage
                  onOpenPayment={handleOpenPayment}
                />
              }
            />
            <Route
              path="/expenses"
              element={
                <ExpensesPage
                  onOpenNewExpense={() => setIsExpenseOpen(true)}
                />
              }
            />
            <Route path="/referrals" element={<ReferralsPage />} />
            <Route path="/financial" element={<FinancialPage />} />
            <Route
              path="/settings"
              element={
                <div className="p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Configurações da Conta</h2>
                  <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nome do Vendedor</label>
                      <p className="text-base font-bold text-slate-800 dark:text-slate-100">{user.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Telefone (Login)</label>
                      <p className="text-base font-mono font-bold text-slate-800 dark:text-slate-100">{user.phone}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Perfil</label>
                      <p className="text-base font-bold text-brand-blue">{user.role}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Aparência</label>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{isDark ? 'Modo escuro ativado' : 'Modo claro ativado'}</p>
                      </div>
                      <ThemeToggle />
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block">Segurança</label>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">Troque sua senha de acesso</p>
                      </div>
                      <button
                        onClick={() => setIsChangePasswordOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors flex-shrink-0"
                      >
                        <KeyRound className="w-4 h-4" />
                        Trocar Senha
                      </button>
                    </div>
                  </div>
                </div>
              }
            />
            <Route
              path="/super-admin"
              element={
                user.role === 'SUPER_ADMIN' ? (
                  <SuperAdminPage onOpenNewSeller={() => setIsNewSellerOpen(true)} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Modals */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onSuccess={triggerGlobalRefresh}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        installment={selectedInstallment}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedInstallment(null);
        }}
        onSuccess={triggerGlobalRefresh}
      />

      <CustomerModal
        isOpen={isCustomerOpen}
        customer={selectedCustomer}
        onClose={() => {
          setIsCustomerOpen(false);
          setSelectedCustomer(null);
        }}
        onSuccess={triggerGlobalRefresh}
      />

      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        onSuccess={triggerGlobalRefresh}
      />

      <NewSellerModal
        isOpen={isNewSellerOpen}
        onClose={() => setIsNewSellerOpen(false)}
        onSuccess={triggerGlobalRefresh}
      />

      <OverdueAlertModal
        isOpen={isOverdueAlertOpen}
        items={overdueAlert.items}
        totalValue={overdueAlert.total}
        onClose={() => setIsOverdueAlertOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
