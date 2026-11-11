import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { connectSocket } from '../services/socket';

const AuthContext = createContext(null);
const TOKEN_KEY = 'tomanbin:token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true); // validando token salvo

  const saveSession = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Ao abrir o site, confirma no backend se o token salvo ainda vale
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(logout)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Token expirado em qualquer requisição -> desloga
  useEffect(() => {
    window.addEventListener('tomanbin:unauthorized', logout);
    return () => window.removeEventListener('tomanbin:unauthorized', logout);
  }, [logout]);

  // Socket reconecta sempre que muda o login
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const s = connectSocket(token);
    setSocket(s);
    return () => s.disconnect();
  }, [token]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    saveSession(data);
    return data.user;
  };

  const value = {
    user,
    setUser,
    socket,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
