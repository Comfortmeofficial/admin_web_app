import { adminClient } from '@/lib/api';
import type { Admin, CreateAdminPayload, Marshal, Ride, UpdateAdminPayload } from '@/types';

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

  // Returns a server-generated temporary password in plaintext — the admin
  // triggering this communicates it to the account owner out of band, same
  // pattern as driversApi's equivalent. There's no way to set a specific
  // chosen password here; the backend route doesn't accept one.
  resetPassword: async (id: string): Promise<{ temporary_password: string }> => {
    const { data } = await adminClient.post(`/api/v1/admins/${id}/reset-password`);
    return data;
  },

  // Invalidates every token this admin currently holds — they're logged out
  // of any active session on their very next request, not just prevented
  // from logging in again.
  forceLogout: async (id: string): Promise<void> => {
    await adminClient.post(`/api/v1/admins/${id}/force-logout`);
  },

  listMarshals: async () => {
    const { data } = await adminClient.get('/api/v1/admins/marshals');
    return data as Marshal[];
  },

  // Active marshals not currently on any bus — what the Bus Detail
  // Assign/Reassign Marshal picker needs. listMarshals() above stays the
  // full roster, still needed for the management page and for resolving
  // already-assigned marshals' names on that same Bus Detail page.
  listUnassignedMarshals: async () => {
    const { data } = await adminClient.get('/api/v1/admins/marshals/unassigned');
    return data as Marshal[];
  },

  getMarshal: async (id: string) => {
    const { data } = await adminClient.get(`/api/v1/admins/marshals/${id}`);
    return data as Marshal;
  },

  getTrips: async (id: string) => {
    const { data } = await adminClient.get(`/api/v1/admins/${id}/trips`);
    return data as Ride[];
  },
};
