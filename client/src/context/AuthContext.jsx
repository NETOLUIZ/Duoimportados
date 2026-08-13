import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSellerId, setActiveSellerId] = useState(localStorage.getItem('vendas_target_seller_id') || null);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (phone, password) => {
    const res = await api.post('/auth/login', { phone, password });
    const userData = res.data.user;
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('vendas_target_seller_id');
    sessionStorage.removeItem('overdue_alert_shown');
    setUser(null);
    setActiveSellerId(null);
    window.location.href = '/login';
  };

  const switchTargetSeller = (sellerId) => {
    sessionStorage.removeItem('overdue_alert_shown');
    if (sellerId) {
      localStorage.setItem('vendas_target_seller_id', sellerId);
      setActiveSellerId(sellerId);
    } else {
      localStorage.removeItem('vendas_target_seller_id');
      setActiveSellerId(null);
    }
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      activeSellerId,
      switchTargetSeller,
      isSuperAdmin: user?.role === 'SUPER_ADMIN'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
