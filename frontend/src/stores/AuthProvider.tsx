import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './authContext';
import { authApi } from '../api/auth';
import type { User, LoginRequest } from '../types';

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      await authApi.login(credentials);
      const userData = await authApi.me();
      setUser(userData);
      setIsAuthenticated(true);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    authApi
      .me()
      .then((userData) => {
        if (isMounted) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      checkAuth,
    }),
    [user, isAuthenticated, loading, login, logout, checkAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
