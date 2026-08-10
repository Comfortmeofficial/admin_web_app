import { bookingClient } from '@/lib/api';
import type { Booking } from '@/types';

export const bookingsApi = {
  list: async (params: { skip?: number; limit?: number; user_id?: string; ride_id?: string } = {}) => {
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
    const { data } = await bookingClient.get(`/api/v1/bookings/ref/${reference}`);
    return data as Booking;
  },

  cancel: async (id: string) => {
    await bookingClient.delete(`/api/v1/bookings/${id}`);
  },

  board: async (id: string, code: string) => {
    await bookingClient.post(`/api/v1/bookings/${id}/board`, { code });
  },
};
