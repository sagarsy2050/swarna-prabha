import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/api/client.js';
import { setAccessToken, getAccessToken } from '@/api/http.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      // No access token in memory but a refresh cookie may exist — try it.
      if (!getAccessToken()) {
        try {
          await api.auth.refresh();
        } catch {
          /* not logged in */
        }
      }
      if (getAccessToken()) {
        const { data } = await api.auth.me();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.auth.login({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.auth.register(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const { data } = await api.auth.me();
    setUser(data);
    return data;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    hasRole: (...roles) => !!user && roles.flat().includes(user.role),
    login,
    register,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export default AuthContext;
