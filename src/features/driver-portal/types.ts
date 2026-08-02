export interface DriverProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  current_ride_id: number | null;
}

export interface DriverAuthTokens {
  access_token: string;
  refresh_token: string;
  driver: DriverProfile;
}

export interface RideSummary {
  id: number;
  departure_time: string;
  status: string;
  route: {
    location: { name: string };
    destination: { name: string };
  };
}

export interface RideCode {
  qr_payload: string;
  otp: string;
}

export type DriverPackageStatus = 'pending_pickup' | 'in_transit' | 'delivered' | 'cancelled';

export interface DriverPackage {
  id: number;
  order_id: string;
  recipient_name: string;
  recipient_phone: string;
  drop_off_note?: string;
  status: DriverPackageStatus;
}
