import { bookingClient } from '@/lib/api';
import type { Route, CreateRoutePayload, Location, Destination, Stop } from '@/types';

export const routesApi = {
  // Locations
  listLocations: async () => {
    const { data } = await bookingClient.get('/api/v1/locations');
    return data as Location[];
  },
  createLocation: async (payload: { name: string; state?: string }) => {
    const { data } = await bookingClient.post('/api/v1/locations', payload);
    return data as Location;
  },
  updateLocation: async (id: string, payload: Partial<Location>) => {
    const { data } = await bookingClient.put(`/api/v1/locations/${id}`, payload);
    return data as Location;
  },
  deleteLocation: async (id: string) => {
    await bookingClient.delete(`/api/v1/locations/${id}`);
  },

  // Destinations
  listDestinations: async () => {
    const { data } = await bookingClient.get('/api/v1/destinations');
    return data as Destination[];
  },
  createDestination: async (payload: { name: string; state?: string }) => {
    const { data } = await bookingClient.post('/api/v1/destinations', payload);
    return data as Destination;
  },
  updateDestination: async (id: string, payload: Partial<Destination>) => {
    const { data } = await bookingClient.put(`/api/v1/destinations/${id}`, payload);
    return data as Destination;
  },
  deleteDestination: async (id: string) => {
    await bookingClient.delete(`/api/v1/destinations/${id}`);
  },

  // Stops
  listStops: async () => {
    const { data } = await bookingClient.get('/api/v1/stops');
    return data as Stop[];
  },
  createStop: async (payload: { name: string; state: string }) => {
    const { data } = await bookingClient.post('/api/v1/stops', payload);
    return data as Stop;
  },
  deleteStop: async (id: string) => {
    await bookingClient.delete(`/api/v1/stops/${id}`);
  },

  // Routes
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await bookingClient.get('/api/v1/routes', { params });
    return data as Route[];
  },
  get: async (id: string) => {
    const { data } = await bookingClient.get(`/api/v1/routes/${id}`);
    return data as Route;
  },
  create: async (payload: CreateRoutePayload) => {
    const { data } = await bookingClient.post('/api/v1/routes', payload);
    return data as Route;
  },
  getDistance: async (locationId: string, destinationId: string) => {
    const { data } = await bookingClient.get('/api/v1/routes/distance', {
      params: { location_id: locationId, destination_id: destinationId },
    });
    return data as { distance_km: number };
  },
  delete: async (id: string) => {
    await bookingClient.delete(`/api/v1/routes/${id}`);
  },
};
