import { bookingClient } from '@/lib/api';
import type { Package } from '@/types';

export const packagesApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await bookingClient.get('/api/v1/packages/all', { params });
    // A gateway/routing misconfiguration returns 200 with an HTML fallback page
    // rather than an error status, so a non-array response must be treated as
    // "no data" rather than trusted as Package[].
    return Array.isArray(data) ? (data as Package[]) : [];
  },

  get: async (id: string) => {
    const { data } = await bookingClient.get(`/api/v1/packages/${id}`);
    return data as Package;
  },
};
