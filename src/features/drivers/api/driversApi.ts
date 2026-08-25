import { driverClient } from '@/lib/api';
import type { Driver, CreateDriverPayload } from '@/types';

export const driversApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await driverClient.get('/api/v1/drivers/', { params });
    return data as Driver[];
  },

  listAvailable: async () => {
    const { data } = await driverClient.get('/api/v1/drivers/available');
    return data as Driver[];
  },

  get: async (id: string) => {
    const { data } = await driverClient.get(`/api/v1/drivers/${id}`);
    return data as Driver;
  },

  create: async (payload: CreateDriverPayload) => {
    const { data } = await driverClient.post('/api/v1/drivers/', payload);
    return data as Driver;
  },

  update: async (id: string, payload: Partial<Driver>) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, payload);
    return data as Driver;
  },

  delete: async (id: string) => {
    await driverClient.delete(`/api/v1/drivers/${id}`);
  },

  approve: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, { verification_status: 'approved' });
    return data as Driver;
  },

  reject: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, {
      verification_status: 'rejected',
    });
    return data as Driver;
  },

  suspend: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, { status: 'suspended' });
    return data as Driver;
  },

  reinstate: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, { status: 'available' });
    return data as Driver;
  },

  setAvailable: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, { status: 'available' });
    return data as Driver;
  },

  setUnavailable: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, { status: 'offline' });
    return data as Driver;
  },
};
