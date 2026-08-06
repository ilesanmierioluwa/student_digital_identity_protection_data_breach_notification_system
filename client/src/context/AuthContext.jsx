import { createContext, useEffect, useState, useCallback } from 'react';
import api, { setAccessToken, clearAccessToken } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((res) => setUser(res.data.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.data?.data?.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    setUser(res.data.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      /* ignore */
    }
    clearAccessToken();
    setUser(null);
  }, []);

  const setAuthUser = useCallback((u) => setUser(u), []);

  return (
    <AuthContext.Provider value={{ user, setUser: setAuthUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
