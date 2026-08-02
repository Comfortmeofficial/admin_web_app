import { driverAuthClient, driverBookingClient } from './driverPortalClient';
import type { DriverAuthTokens, DriverPackage, DriverProfile, RideCode, RideSummary } from '../types';

export const driverPortalApi = {
  login: async (email: string, password: string): Promise<DriverAuthTokens> => {
    const { data } = await driverAuthClient.post('/api/v1/drivers/auth/login', { email, password });
    return data;
  },

  me: async (): Promise<DriverProfile> => {
    const { data } = await driverAuthClient.get('/api/v1/drivers/me');
    return data;
  },

  getRide: async (rideId: number): Promise<RideSummary> => {
    const { data } = await driverBookingClient.get(`/api/v1/rides/${rideId}`);
    return data;
  },

  getRideCode: async (rideId: number): Promise<RideCode> => {
    const { data } = await driverBookingClient.get(`/api/v1/rides/${rideId}/ride-code`);
    return data;
  },

  getRidePackages: async (rideId: number): Promise<DriverPackage[]> => {
    const { data } = await driverBookingClient.get(`/api/v1/rides/${rideId}/packages`);
    return data;
  },

  deliverPackage: async (packageId: number, otp: string): Promise<DriverPackage> => {
    const { data } = await driverBookingClient.post(`/api/v1/packages/${packageId}/deliver`, { otp });
    return data;
  },
};
