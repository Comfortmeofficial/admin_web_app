import { adminClient } from '@/lib/api';
import type { Admin, CreateAdminPayload, UpdateAdminPayload } from '@/types';

export const adminsApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await adminClient.get('/api/v1/admins', { params });
    return data as Admin[];
  },

  get: async (id: string) => {
    const { data } = await adminClient.get(`/api/v1/admins/${id}`);
    return data as Admin;
  },

  create: async (payload: CreateAdminPayload) => {
    const { data } = await adminClient.post('/api/v1/admins', payload);
    return data as Admin;
  },

  update: async (id: string, payload: UpdateAdminPayload) => {
    const { data } = await adminClient.put(`/api/v1/admins/${id}`, payload);
    return data as Admin;
  },

  delete: async (id: string) => {
    await adminClient.delete(`/api/v1/admins/${id}`);
  },

  suspend: async (id: string) => {
    const { data } = await adminClient.put(`/api/v1/admins/${id}`, { is_active: false });
    return data as Admin;
  },

  activate: async (id: string) => {
    const { data } = await adminClient.put(`/api/v1/admins/${id}`, { is_active: true });
    return data as Admin;
  },

  resetPassword: async (id: string, newPassword: string) => {
    await adminClient.post(`/api/v1/admins/${id}/reset-password`, { new_password: newPassword });
  },
};
