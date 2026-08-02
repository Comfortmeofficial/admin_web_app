import axios, { type AxiosInstance } from 'axios';
import { SERVICE_URLS } from '@/lib/constants';

// The driver portal is a separate principal from admin staff, so it deliberately
// does NOT reuse lib/api.ts's shared createClient/adminClient — that factory is
// hard-wired to the admin's TOKEN_KEY and admin refresh endpoint. A bug in one
// auth flow must not be able to affect the other.
export const DRIVER_TOKEN_KEY = 'cm_driver_token';
export const DRIVER_REFRESH_TOKEN_KEY = 'cm_driver_refresh_token';
export const DRIVER_KEY = 'cm_driver_data';

function createDriverPortalClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(DRIVER_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      const isAuthEndpoint = original?.url?.includes('/auth/');
      if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
        original._retry = true;
        try {
          const refreshToken = localStorage.getItem(DRIVER_REFRESH_TOKEN_KEY);
          if (!refreshToken) throw new Error('No refresh token');
          const { data } = await axios.post(`${SERVICE_URLS.DRIVER}/api/v1/drivers/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem(DRIVER_TOKEN_KEY, data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return client(original);
        } catch {
          localStorage.removeItem(DRIVER_TOKEN_KEY);
          localStorage.removeItem(DRIVER_REFRESH_TOKEN_KEY);
          localStorage.removeItem(DRIVER_KEY);
          window.location.href = '/driver/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

// driver_service — login/refresh/profile.
export const driverAuthClient = createDriverPortalClient(SERVICE_URLS.DRIVER);
// booking_service — ride lookup, boarding/package codes.
export const driverBookingClient = createDriverPortalClient(SERVICE_URLS.BOOKING);
