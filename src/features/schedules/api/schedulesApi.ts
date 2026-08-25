import { bookingClient } from '@/lib/api';
import type { RideSchedule, CreateRideSchedulePayload, RideScheduleStatus } from '@/types';

export const schedulesApi = {
  list: async () => {
    const { data } = await bookingClient.get('/api/v1/ride-schedules');
    return data as RideSchedule[];
  },
  get: async (id: string) => {
    const { data } = await bookingClient.get(`/api/v1/ride-schedules/${id}`);
    return data as RideSchedule;
  },
  create: async (payload: CreateRideSchedulePayload) => {
    const { data } = await bookingClient.post('/api/v1/ride-schedules', payload);
    return data as RideSchedule;
  },
  update: async (id: string, payload: CreateRideSchedulePayload) => {
    const { data } = await bookingClient.patch(`/api/v1/ride-schedules/${id}`, payload);
    return data as RideSchedule;
  },
  updateStatus: async (id: string, status: RideScheduleStatus) => {
    const { data } = await bookingClient.patch(`/api/v1/ride-schedules/${id}/status`, { status });
    return data as RideSchedule;
  },
  delete: async (id: string) => {
    await bookingClient.delete(`/api/v1/ride-schedules/${id}`);
  },
  // Fire-and-forget opportunistic trigger for ensureScheduledRidesGenerated()
  // — the Schedules page calls this on load so recurring rides actually get
  // created even without a cron job configured on the deploy target.
  generateNow: async () => {
    await bookingClient.get('/api/v1/cron/generate-rides');
  },
};
