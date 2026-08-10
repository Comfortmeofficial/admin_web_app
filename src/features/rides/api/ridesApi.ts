import { bookingClient } from '@/lib/api';
import type { ChatMessage, Passenger, Ride, CreateRidePayload, RideStatus } from '@/types';

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

  assignMarshal: async (rideId: string, marshalAdminId: number | null) => {
    const { data } = await bookingClient.patch(`/api/v1/rides/${rideId}/marshal`, {
      marshal_admin_id: marshalAdminId,
    });
    return data as Ride;
  },

  // A marshal's own assigned trip(s).
  mine: async () => {
    const { data } = await bookingClient.get('/api/v1/rides/mine');
    return data as Ride[];
  },

  getPassengers: async (rideId: string) => {
    const { data } = await bookingClient.get(`/api/v1/rides/${rideId}/passengers`);
    return data as Passenger[];
  },

  getChatMessages: async (rideId: string, userId: number) => {
    const { data } = await bookingClient.get(`/api/v1/rides/${rideId}/chat/${userId}/messages`);
    return data as ChatMessage[];
  },

  sendChatMessage: async (rideId: string, userId: number, message: string) => {
    const { data } = await bookingClient.post(`/api/v1/rides/${rideId}/chat/${userId}/messages`, { message });
    return data as ChatMessage;
  },
};
