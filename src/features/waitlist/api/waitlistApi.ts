import { authClient } from '@/lib/api';
import type { WaitlistEntry, WaitlistEntryPayload } from '@/types';

export const waitlistApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await authClient.get('/api/v1/auth/waitlist', { params });
    return data as WaitlistEntry[];
  },
  get: async (id: string) => {
    const { data } = await authClient.get(`/api/v1/auth/waitlist/${id}`);
    return data as WaitlistEntry;
  },
  // Same endpoint the public landing page's waitlist form posts to — an
  // admin manually adding someone (they called or emailed directly) is the
  // same operation, just admin-initiated, so there's no separate admin-only
  // create endpoint.
  create: async (payload: WaitlistEntryPayload) => {
    const { data } = await authClient.post('/api/v1/auth/waitlist', payload);
    return data.data as { id: string; email: string };
  },
  update: async (id: string, payload: WaitlistEntryPayload) => {
    const { data } = await authClient.put(`/api/v1/auth/waitlist/${id}`, payload);
    return data as WaitlistEntry;
  },
  delete: async (id: string) => {
    await authClient.delete(`/api/v1/auth/waitlist/${id}`);
  },
};
