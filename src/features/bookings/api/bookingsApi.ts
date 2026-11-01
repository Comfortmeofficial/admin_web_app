import { bookingClient } from '@/lib/api';
import type { Booking, BookingStatus } from '@/types';

export const bookingsApi = {
  list: async (
    params: { skip?: number; limit?: number; user_id?: string; ride_id?: string; status?: BookingStatus } = {},
  ) => {
    // Use /all for admin (no user_id required); fall back to user-scoped if user_id provided
    const endpoint = params.user_id ? '/api/v1/bookings' : '/api/v1/bookings/all';
    const { data } = await bookingClient.get(endpoint, { params });
    return (Array.isArray(data) ? data : (data?.data ?? [])) as Booking[];
  },

  get: async (id: string) => {
    const { data } = await bookingClient.get(`/api/v1/bookings/${id}`);
    return data as Booking;
  },

  getByReference: async (reference: string) => {
    const { data } = await bookingClient.get(`/api/v1/bookings/reference/${reference}`);
    return data as Booking;
  },

  // No refund, no notification - for cancellations that genuinely don't
  // warrant one (a no-show, fraud, correcting a mistake).
  cancel: async (id: string) => {
    await bookingClient.delete(`/api/v1/bookings/${id}`);
  },

  // Full refund, no cancellation fee, plus a notification to the customer -
  // for when the platform is cancelling an otherwise-valid booking through
  // no fault of theirs (its route or schedule was removed, say).
  cancelWithRefund: async (id: string) => {
    const { data } = await bookingClient.post(`/api/v1/payment-hub/admin-cancel-booking/${id}`);
    return data as { refund_amount: number };
  },

  board: async (id: string, code: string) => {
    await bookingClient.post(`/api/v1/bookings/${id}/board`, { code });
  },

  markNoShow: async (id: string) => {
    await bookingClient.post(`/api/v1/bookings/${id}/no-show`);
  },
};
