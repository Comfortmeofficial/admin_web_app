import { adminClient } from '@/lib/api';
import type { Admin, LoginCredentials } from '@/types';

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  admin_id: string;
  role: string;
  admin: Admin;
}

export const authApi = {
  login: async (creds: LoginCredentials): Promise<AdminLoginResponse> => {
    const { data } = await adminClient.post('/api/v1/admin/auth/login', creds);
    return data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await adminClient.post('/api/v1/admin/auth/forgot-password', { email });
  },

  resetPassword: async (payload: {
    email: string;
    otp: string;
    new_password: string;
  }): Promise<void> => {
    await adminClient.post('/api/v1/admin/auth/reset-password', payload);
  },

  changePassword: async (payload: {
    email: string;
    current_password: string;
    new_password: string;
  }): Promise<void> => {
    await adminClient.post('/api/v1/admin/auth/change-password', payload);
  },
};
