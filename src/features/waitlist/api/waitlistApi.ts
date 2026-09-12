import { authClient } from '@/lib/api';
import type { WaitlistEntry } from '@/types';

export const waitlistApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await authClient.get('/api/v1/auth/waitlist', { params });
    return data as WaitlistEntry[];
  },
};
