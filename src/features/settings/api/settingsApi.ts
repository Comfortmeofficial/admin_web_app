import { authClient } from '@/lib/api';

export type PaymentGateway = 'paystack' | 'flutterwave';

export const settingsApi = {
  getPaymentGateway: async () => {
    const { data } = await authClient.get('/api/v1/admin/payment-gateway');
    return data as { active_gateway: PaymentGateway };
  },
  setPaymentGateway: async (active_gateway: PaymentGateway) => {
    const { data } = await authClient.put('/api/v1/admin/payment-gateway', { active_gateway });
    return data as { active_gateway: PaymentGateway };
  },
};
