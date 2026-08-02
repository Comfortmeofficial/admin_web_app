import { userClient, bookingClient, walletClient } from '@/lib/api';
import type { User } from '@/types';

export const usersApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await userClient.get('/api/v1/users/', { params });
    return data as User[];
  },

  get: async (id: string) => {
    const { data } = await userClient.get(`/api/v1/users/${id}`);
    return data as User;
  },

  getByEmail: async (email: string) => {
    const { data } = await userClient.get(`/api/v1/users/by-email/${encodeURIComponent(email)}`);
    return data as User;
  },

  update: async (id: string, payload: Partial<User>) => {
    const { data } = await userClient.put(`/api/v1/users/${id}`, payload);
    return data as User;
  },

  suspend: async (id: string) => {
    const { data } = await userClient.put(`/api/v1/users/${id}`, { is_active: false });
    return data as User;
  },

  activate: async (id: string) => {
    const { data } = await userClient.put(`/api/v1/users/${id}`, { is_active: true });
    return data as User;
  },

  getBookings: async (userId: string) => {
    const { data } = await bookingClient.get('/api/v1/bookings', { params: { user_id: userId, skip: 0, limit: 50 } });
    return data;
  },

  getWallet: async (userId: string) => {
    const { data } = await walletClient.get(`/api/v1/wallet/${userId}`);
    return data;
  },

  getWalletTransactions: async (userId: string) => {
    const { data } = await walletClient.get(`/api/v1/wallet/${userId}/transactions`);
    return data;
  },
};
