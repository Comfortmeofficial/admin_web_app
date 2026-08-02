export const SERVICE_URLS = {
  ADMIN: import.meta.env.VITE_ADMIN_SERVICE_URL ?? 'http://localhost:4000',
  AUTH: import.meta.env.VITE_AUTH_SERVICE_URL ?? 'http://localhost:3000',
  USER: import.meta.env.VITE_USER_SERVICE_URL ?? 'http://localhost:8001',
  DRIVER: import.meta.env.VITE_DRIVER_SERVICE_URL ?? 'http://localhost:8010',
  BUS: import.meta.env.VITE_BUS_SERVICE_URL ?? 'http://localhost:3001',
  BOOKING: import.meta.env.VITE_BOOKING_SERVICE_URL ?? 'http://localhost:8080',
  PAYMENT_GATEWAY: import.meta.env.VITE_PAYMENT_GATEWAY_URL ?? 'http://localhost:8003',
  PAYMENT_HUB: import.meta.env.VITE_PAYMENT_HUB_URL ?? 'http://localhost:8004',
  WALLET: import.meta.env.VITE_WALLET_SERVICE_URL ?? 'http://localhost:8005',
  NOTIFICATION: import.meta.env.VITE_NOTIFICATION_SERVICE_URL ?? 'http://localhost:8008',
  REWARD: import.meta.env.VITE_REWARD_SERVICE_URL ?? 'http://localhost:8007',
  TERMS: import.meta.env.VITE_TERMS_SERVICE_URL ?? 'http://localhost:8009',
} as const;

export const TOKEN_KEY = 'cm_admin_token';
export const REFRESH_TOKEN_KEY = 'cm_admin_refresh_token';
export const ADMIN_KEY = 'cm_admin_data';

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  operations_manager: 'Operations Manager',
  customer_support: 'Customer Support',
  finance_officer: 'Finance Officer',
};

export const PAGE_SIZE = 20;
