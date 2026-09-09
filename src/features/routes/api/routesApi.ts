import { bookingClient } from '@/lib/api';
import type { Route, CreateRoutePayload, Location } from '@/types';

export const routesApi = {
  // Locations — the single place list routes are built from. destinations/
  // stops still exist as their own DB tables (the mobile app reads them
  // directly), but the admin only ever manages Locations; createRoute
  // mirrors picked locations into those tables server-side as needed.
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
