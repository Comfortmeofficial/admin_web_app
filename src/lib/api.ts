import axios, { type AxiosInstance } from 'axios';
import { SERVICE_URLS, TOKEN_KEY, REFRESH_TOKEN_KEY, ADMIN_KEY } from './constants';

function createClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['x-request-id'] = crypto.randomUUID();
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
          const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (!refresh) throw new Error('No refresh token');
          const { data } = await axios.post(`${SERVICE_URLS.ADMIN}/api/v1/admin/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem(TOKEN_KEY, data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return client(original);
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(ADMIN_KEY);
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const adminClient = createClient(SERVICE_URLS.ADMIN);
export const authClient = createClient(SERVICE_URLS.AUTH);
export const userClient = createClient(SERVICE_URLS.USER);
export const driverClient = createClient(SERVICE_URLS.DRIVER);
export const busClient = createClient(SERVICE_URLS.BUS);
export const bookingClient = createClient(SERVICE_URLS.BOOKING);
export const paymentGatewayClient = createClient(SERVICE_URLS.PAYMENT_GATEWAY);
export const paymentHubClient = createClient(SERVICE_URLS.PAYMENT_HUB);
export const walletClient = createClient(SERVICE_URLS.WALLET);
export const notificationClient = createClient(SERVICE_URLS.NOTIFICATION);
export const rewardClient = createClient(SERVICE_URLS.REWARD);
export const termsClient = createClient(SERVICE_URLS.TERMS);
