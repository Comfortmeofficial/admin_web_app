import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Admin, AuthTokens, AdminRole } from '@/types';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, ADMIN_KEY } from '@/lib/constants';
import { adminClient } from '@/lib/api';

interface AuthContextValue {
  admin: Admin | null;
  token: string | null;
  role: AdminRole | null;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens & { admin: Admin }) => void;
  logout: () => void;
  hasRole: (roles: AdminRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    try {
      const stored = localStorage.getItem(ADMIN_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );

  useEffect(() => {
    if (token) {
      adminClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete adminClient.defaults.headers.common.Authorization;
    }
  }, [token]);

  const login = (payload: AuthTokens & { admin: Admin }) => {
    localStorage.setItem(TOKEN_KEY, payload.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refresh_token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(payload.admin));
    setToken(payload.access_token);
    setAdmin(payload.admin);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setToken(null);
    setAdmin(null);
  };

  const hasRole = (roles: AdminRole[]) => {
    if (!admin) return false;
    return roles.includes(admin.role);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        role: admin?.role ?? null,
        isAuthenticated: !!token && !!admin,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
