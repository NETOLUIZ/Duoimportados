import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Automatically sends HttpOnly auth_token cookie with every request
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response Interceptor: Handle 401 Unauthorized token expiry safely
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('vendas_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

export default api;
