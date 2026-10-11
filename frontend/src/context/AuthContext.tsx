import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAccessToken, setStoredRefreshToken, getStoredRefreshToken } from '../api/client';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'USER';
  isTwoFactorEnabled: boolean;
  isEmailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginState: (user: User, token: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
  updateUser2FAStatus: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session on app boot via refresh token cookie or stored token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedRt = getStoredRefreshToken();
        const res = await api.post('/auth/refresh', storedRt ? { refreshToken: storedRt } : {});
        setAccessToken(res.data.accessToken);
        if (res.data.refreshToken) {
          setStoredRefreshToken(res.data.refreshToken);
        }
        if (res.data.user) {
          setUser(res.data.user);
        }
      } catch {
        setUser(null);
        setStoredRefreshToken(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const loginState = (userData: User, token: string, refreshToken?: string) => {
    setUser(userData);
    setAccessToken(token);
    if (refreshToken) {
      setStoredRefreshToken(refreshToken);
    }
  };

  const logout = async () => {
    try {
      const storedRt = getStoredRefreshToken();
      await api.post('/auth/logout', storedRt ? { refreshToken: storedRt } : {});
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      setStoredRefreshToken(null);
    }
  };

  const updateUser2FAStatus = (enabled: boolean) => {
    if (user) {
      setUser({ ...user, isTwoFactorEnabled: enabled });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginState, logout, updateUser2FAStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}; 