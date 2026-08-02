import { bookingClient } from '@/lib/api';
import type { Ride, CreateRidePayload, RideStatus } from '@/types';

export const ridesApi = {
  list: async (params: { skip?: number; limit?: number; status?: string } = {}) => {
    const { data } = await bookingClient.get('/api/v1/rides', { params });
    return data as Ride[];
  },

  get: async (id: string) => {
    const { data } = await bookingClient.get(`/api/v1/rides/${id}`);
    return data as Ride;
  },

  create: async (payload: CreateRidePayload) => {
    const { data } = await bookingClient.post('/api/v1/rides', payload);
    return data as Ride;
  },

  updateStatus: async (id: string, status: RideStatus) => {
    const { data } = await bookingClient.patch(`/api/v1/rides/${id}/status`, { status });
    return data as Ride;
  },

  assignBus: async (rideId: string, busId: string) => {
    const { data } = await bookingClient.patch(`/api/v1/rides/${rideId}/bus`, { bus_id: Number(busId) });
    return data as Ride;
  },

  assignDriver: async (rideId: string, driverId: string) => {
    const { data } = await bookingClient.patch(`/api/v1/rides/${rideId}/driver`, { driver_id: Number(driverId) });
    return data as Ride;
  },

  getSeats: async (id: string) => {
    const { data } = await bookingClient.get(`/api/v1/rides/${id}/seats`);
    return data;
  },
};
