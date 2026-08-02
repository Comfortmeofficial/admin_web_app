import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { DriverAuthTokens, DriverProfile } from '../types';
import { DRIVER_TOKEN_KEY, DRIVER_REFRESH_TOKEN_KEY, DRIVER_KEY, driverAuthClient, driverBookingClient } from '../api/driverPortalClient';

interface DriverAuthContextValue {
  driver: DriverProfile | null;
  isAuthenticated: boolean;
  login: (tokens: DriverAuthTokens) => void;
  logout: () => void;
}

const DriverAuthContext = createContext<DriverAuthContextValue | null>(null);

export function DriverAuthProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(() => {
    try {
      const stored = localStorage.getItem(DRIVER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(DRIVER_TOKEN_KEY));

  useEffect(() => {
    const header = token ? `Bearer ${token}` : undefined;
    if (header) {
      driverAuthClient.defaults.headers.common.Authorization = header;
      driverBookingClient.defaults.headers.common.Authorization = header;
    } else {
      delete driverAuthClient.defaults.headers.common.Authorization;
      delete driverBookingClient.defaults.headers.common.Authorization;
    }
  }, [token]);

  const login = (payload: DriverAuthTokens) => {
    localStorage.setItem(DRIVER_TOKEN_KEY, payload.access_token);
    localStorage.setItem(DRIVER_REFRESH_TOKEN_KEY, payload.refresh_token);
    localStorage.setItem(DRIVER_KEY, JSON.stringify(payload.driver));
    setToken(payload.access_token);
    setDriver(payload.driver);
  };

  const logout = () => {
    localStorage.removeItem(DRIVER_TOKEN_KEY);
    localStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
    localStorage.removeItem(DRIVER_KEY);
    setToken(null);
    setDriver(null);
  };

  return (
    <DriverAuthContext.Provider
      value={{ driver, isAuthenticated: !!token && !!driver, login, logout }}
    >
      {children}
    </DriverAuthContext.Provider>
  );
}

export function useDriverAuth(): DriverAuthContextValue {
  const ctx = useContext(DriverAuthContext);
  if (!ctx) throw new Error('useDriverAuth must be used within DriverAuthProvider');
  return ctx;
}
