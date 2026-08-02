import { bookingClient } from '@/lib/api';
import type { Rental, RentalStatus } from '@/types';

export const rentalsApi = {
  list: async (params: { skip?: number; limit?: number; status?: RentalStatus } = {}) => {
    const { data } = await bookingClient.get('/api/v1/rentals', { params });
    if (Array.isArray(data)) return data as Rental[];
    return ((data as { data?: Rental[]; rentals?: Rental[] })?.data ?? (data as { rentals?: Rental[] })?.rentals ?? []) as Rental[];
  },

  get: async (id: string) => {
    const { data } = await bookingClient.get(`/api/v1/rentals/${id}`);
    return data as Rental;
  },

  setPrice: async (id: string, amount: number) => {
    const { data } = await bookingClient.patch(`/api/v1/rentals/${id}/price`, { amount });
    return data as Rental;
  },

  reject: async (id: string) => {
    const { data } = await bookingClient.patch(`/api/v1/rentals/${id}/status`, { status: 'rejected' });
    return data as Rental;
  },

  complete: async (id: string) => {
    const { data } = await bookingClient.patch(`/api/v1/rentals/${id}/status`, { status: 'completed' });
    return data as Rental;
  },

  cancel: async (id: string) => {
    const { data } = await bookingClient.patch(`/api/v1/rentals/${id}/status`, { status: 'cancelled' });
    return data as Rental;
  },
};
