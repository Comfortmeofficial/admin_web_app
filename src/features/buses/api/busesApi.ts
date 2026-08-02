import { busClient } from '@/lib/api';
import type { Bus, CreateBusPayload, SeatLayout } from '@/types';

function normalizeSeat(seat: Record<string, unknown>) {
  const { seat_number, ...rest } = seat as { seat_number?: string } & Record<string, unknown>;
  return { ...rest, label: seat_number ?? '' };
}

function normalizeLayout(layout: SeatLayout): SeatLayout {
  return {
    ...layout,
    seats: layout.seats.map((s) => normalizeSeat(s as unknown as Record<string, unknown>) as unknown as typeof s),
  };
}

function normalizeBus(bus: Bus): Bus {
  if (!bus.layout) return bus;
  return { ...bus, layout: normalizeLayout(bus.layout) };
}

export const busesApi = {
  list: async () => {
    const { data } = await busClient.get('/api/v1/buses');
    return (data as Bus[]).map(normalizeBus);
  },

  get: async (id: string) => {
    const { data } = await busClient.get(`/api/v1/buses/${id}`);
    return normalizeBus(data as Bus);
  },

  getLayout: async (id: string) => {
    const { data } = await busClient.get(`/api/v1/buses/${id}/layout`);
    return normalizeLayout(data as SeatLayout);
  },

  create: async (payload: CreateBusPayload) => {
    const { data } = await busClient.post('/api/v1/buses', payload);
    return normalizeBus(data as Bus);
  },

  update: async (id: string, payload: Partial<Bus>) => {
    const { data } = await busClient.put(`/api/v1/buses/${id}`, payload);
    return normalizeBus(data as Bus);
  },

  retire: async (id: string) => {
    await busClient.delete(`/api/v1/buses/${id}`);
  },

  assignDriver: async (busId: string, driverId: string) => {
    const { data } = await busClient.post(`/api/v1/buses/${busId}/driver`, { driver_id: Number(driverId) });
    return data;
  },

  unassignDriver: async (busId: string) => {
    await busClient.delete(`/api/v1/buses/${busId}/driver`);
  },

  updateLayout: async (busId: string, layout: SeatLayout) => {
    const payload = {
      layout: {
        ...layout,
        seats: layout.seats.map(({ label, ...rest }) => ({ ...rest, seat_number: label })),
      },
    };
    const { data } = await busClient.put(`/api/v1/buses/${busId}`, payload);
    return normalizeBus(data as Bus);
  },
};
