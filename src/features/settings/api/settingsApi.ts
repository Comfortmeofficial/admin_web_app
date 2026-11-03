import { authClient, notificationClient } from '@/lib/api';

export type PaymentGateway = 'paystack' | 'flutterwave';

export interface BookingAlertEmail {
  id: number;
  email: string;
  created_at: string;
}

export const settingsApi = {
  getPaymentGateway: async () => {
    const { data } = await authClient.get('/api/v1/admin/payment-gateway');
    return data as { active_gateway: PaymentGateway };
  },
  setPaymentGateway: async (active_gateway: PaymentGateway) => {
    const { data } = await authClient.put('/api/v1/admin/payment-gateway', { active_gateway });
    return data as { active_gateway: PaymentGateway };
  },

  // Addresses that get an email every time a booking is made (see the
  // backend's sendBookingAlert) — lets ops keep track of booking activity
  // without opening the dashboard.
  listBookingAlertEmails: async () => {
    const { data } = await notificationClient.get('/api/v1/admin/booking-alert-emails');
    return data as BookingAlertEmail[];
  },
  addBookingAlertEmail: async (email: string) => {
    const { data } = await notificationClient.post('/api/v1/admin/booking-alert-emails', { email });
    return data as BookingAlertEmail;
  },
  removeBookingAlertEmail: async (id: number) => {
    await notificationClient.delete(`/api/v1/admin/booking-alert-emails/${id}`);
  },
};
