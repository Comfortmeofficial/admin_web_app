import { busClient } from '@/lib/api';
import type { Bus, BusDocument, CreateBusPayload, SeatLayout } from '@/types';

export const busesApi = {
  list: async () => {
    const { data } = await busClient.get('/api/v1/buses');
    return data as Bus[];
  },

  get: async (id: string) => {
    const { data } = await busClient.get(`/api/v1/buses/${id}`);
    return data as Bus;
  },

  getLayout: async (id: string) => {
    const { data } = await busClient.get(`/api/v1/buses/${id}/layout`);
    return data as SeatLayout;
  },

  create: async (payload: CreateBusPayload) => {
    const { data } = await busClient.post('/api/v1/buses', payload);
    return data as Bus;
  },

  update: async (id: string, payload: Partial<Bus>) => {
    const { data } = await busClient.put(`/api/v1/buses/${id}`, payload);
    return data as Bus;
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

  assignMarshal: async (busId: string, marshalId: string) => {
    const { data } = await busClient.post(`/api/v1/buses/${busId}/marshals`, { marshal_id: Number(marshalId) });
    return data as Bus;
  },

  unassignMarshal: async (busId: string, marshalId: string) => {
    const { data } = await busClient.delete(`/api/v1/buses/${busId}/marshals/${marshalId}`);
    return data as Bus;
  },

  updateLayout: async (busId: string, layout: SeatLayout) => {
    const { data } = await busClient.put(`/api/v1/buses/${busId}`, { layout });
    return data as Bus;
  },

  listDocuments: async (busId: string) => {
    const { data } = await busClient.get(`/api/v1/buses/${busId}/documents`);
    return data as BusDocument[];
  },

  addDocument: async (busId: string, payload: { title: string; image: string }) => {
    const { data } = await busClient.post(`/api/v1/buses/${busId}/documents`, payload);
    return data as BusDocument;
  },

  deleteDocument: async (busId: string, documentId: string) => {
    await busClient.delete(`/api/v1/buses/${busId}/documents/${documentId}`);
  },
};
