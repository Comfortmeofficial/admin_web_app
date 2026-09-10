import { driverClient } from '@/lib/api';
import type { Driver, CreateDriverPayload, Ride } from '@/types';

export const driversApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await driverClient.get('/api/v1/drivers/', { params });
    return data as Driver[];
  },

  listAvailable: async () => {
    const { data } = await driverClient.get('/api/v1/drivers/available');
    return data as Driver[];
  },

  // Not currently on any bus — distinct from listAvailable, which only
  // excludes suspended drivers. This is what the Assign Driver picker needs.
  listUnassigned: async () => {
    const { data } = await driverClient.get('/api/v1/drivers/unassigned');
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

  suspend: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, { status: 'suspended' });
    return data as Driver;
  },

  // "active" isn't admin-settable — it's driven automatically by the ride
  // lifecycle (see setDriverTripStatus on the backend). Reinstating a
  // suspended driver just returns them to inactive; they go active again
  // on their own once they're actually on a trip.
  reinstate: async (id: string) => {
    const { data } = await driverClient.put(`/api/v1/drivers/${id}`, { status: 'inactive' });
    return data as Driver;
  },

  getTrips: async (id: string) => {
    const { data } = await driverClient.get(`/api/v1/drivers/${id}/trips`);
    return data as Ride[];
  },
};
