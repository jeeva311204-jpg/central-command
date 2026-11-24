import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  switchUser: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('changeflow_token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('changeflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // If token and cached user exist, render immediately without blocking spinner
  const [isLoading, setIsLoading] = useState(() => {
    const t = localStorage.getItem('changeflow_token');
    const u = localStorage.getItem('changeflow_user');
    return t ? !u : false;
  });

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const userData = await api.getMe();
          if (userData && userData.id) {
            setUser(userData);
            localStorage.setItem('changeflow_user', JSON.stringify(userData));
          }
        } catch (e: any) {
          console.warn('Session verification notice:', e?.message);
          // Only clear if hard auth error and no cached user
          if (e?.message?.includes('401') || e?.message?.includes('403')) {
            localStorage.removeItem('changeflow_token');
            localStorage.removeItem('changeflow_user');
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string = 'ChangeFlow2026!') => {
    const res = await api.login({ email, password });
    localStorage.setItem('changeflow_token', res.token);
    localStorage.setItem('changeflow_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsLoading(false);
  };

  const switchUser = async (email: string) => {
    const res = await api.switchDemoUser(email);
    localStorage.setItem('changeflow_token', res.token);
    localStorage.setItem('changeflow_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('changeflow_token');
    localStorage.removeItem('changeflow_user');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, switchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
