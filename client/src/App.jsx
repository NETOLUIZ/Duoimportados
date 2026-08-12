import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import NewSaleModal from './components/NewSaleModal';
import PaymentModal from './components/PaymentModal';
import CustomerModal from './components/CustomerModal';
import ExpenseModal from './components/ExpenseModal';
import NewSellerModal from './components/NewSellerModal';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import InstallmentsPage from './pages/InstallmentsPage';
import ExpensesPage from './pages/ExpensesPage';
import FinancialPage from './pages/FinancialPage';
import SuperAdminPage from './pages/SuperAdminPage';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Modals state
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isNewSellerOpen, setIsNewSellerOpen] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Iniciando Crediário VIP...</p>
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
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      {/* 1. Fixed Sidebar (100% Height) */}
      <Sidebar onOpenNewSale={() => setIsNewSaleOpen(true)} />

      {/* 2. Main Content Canvas (Flexible 100% Width & Height) */}
      <div className="flex-1 flex flex-col pl-64 h-screen overflow-y-auto">
        <Topbar />

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
            <Route path="/financial" element={<FinancialPage />} />
            <Route
              path="/settings"
              element={
                <div className="p-6">
                  <h2 className="text-2xl font-black text-slate-800 mb-2">Configurações da Conta</h2>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-xl space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome do Vendedor</label>
                      <p className="text-base font-bold text-slate-800">{user.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Telefone (Login)</label>
                      <p className="text-base font-mono font-bold text-slate-800">{user.phone}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Perfil</label>
                      <p className="text-base font-bold text-brand-blue">{user.role}</p>
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
