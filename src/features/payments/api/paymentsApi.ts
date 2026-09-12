import { paymentGatewayClient } from '@/lib/api';
import type { Payment, PaymentMethod, PaymentPurpose, PaymentStatus } from '@/types';

export interface ListPaymentsParams {
  skip?: number;
  limit?: number;
  status?: PaymentStatus;
  purpose?: PaymentPurpose;
  payment_method?: PaymentMethod;
  from?: string;
  to?: string;
}

export const paymentsApi = {
  list: async (params: ListPaymentsParams = {}) => {
    const { data } = await paymentGatewayClient.get('/api/v1/payments', { params });
    return data as Payment[];
  },
};
