import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { getRefreshToken, saveTokens, clearTokens } from '../utils/secureStore';

export interface User {
  id: string;
  username: string;
  email?: string;
  isEmailVerified?: boolean;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'USER';
  isTwoFactorEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginSuccess: (userData: User, accessToken: string, refreshToken?: string) => Promise<void>;
  updateUser2FAStatus: (enabled: boolean) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedRefreshToken = await getRefreshToken();
        if (!storedRefreshToken) {
          setLoading(false);
          return;
        }

        const res = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
        await saveTokens(res.data.accessToken, res.data.refreshToken);

        const profileRes = await api.get('/auth/me');
        setUser(profileRes.data.user);
      } catch {
        await clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const loginSuccess = async (userData: User, accessToken: string, refreshToken?: string) => {
    await saveTokens(accessToken, refreshToken);
    setUser(userData);
  };

  const updateUser2FAStatus = (enabled: boolean) => {
    if (user) {
      setUser({ ...user, isTwoFactorEnabled: enabled });
    }
  };

  const logout = async () => {
    try {
      const storedRefreshToken = await getRefreshToken();
      await api.post('/auth/logout', { refreshToken: storedRefreshToken });
    } catch {
      // Ignore network errors on logout
    } finally {
      await clearTokens();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginSuccess, updateUser2FAStatus, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};