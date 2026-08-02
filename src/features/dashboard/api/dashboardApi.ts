import { userClient, driverClient, busClient, bookingClient, walletClient } from '@/lib/api';
import type { DashboardStats, Ride, Booking } from '@/types';

const LARGE = 1000;

const safeArray = <T>(res: PromiseSettledResult<{ data: unknown }>): T[] => {
  if (res.status === 'fulfilled' && Array.isArray(res.value.data)) return res.value.data as T[];
  return [];
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const [usersRes, driversRes, busesRes, ridesRes, bookingsRes] = await Promise.allSettled([
      userClient.get('/api/v1/users/', { params: { skip: 0, limit: LARGE } }),
      driverClient.get('/api/v1/drivers/', { params: { skip: 0, limit: LARGE } }),
      busClient.get('/api/v1/buses', { params: { limit: LARGE } }),
      bookingClient.get('/api/v1/rides', { params: { skip: 0, limit: LARGE } }),
      bookingClient.get('/api/v1/bookings/all', { params: { skip: 0, limit: LARGE } }),
    ]);

    const users = safeArray(usersRes as PromiseSettledResult<{ data: unknown }>);
    const drivers = safeArray(driversRes as PromiseSettledResult<{ data: unknown }>);
    const buses = safeArray(busesRes as PromiseSettledResult<{ data: unknown }>);
    const rides = safeArray<Ride>(ridesRes as PromiseSettledResult<{ data: unknown }>);
    const bookings = safeArray<Booking>(bookingsRes as PromiseSettledResult<{ data: unknown }>);

    const revenue = rides
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + r.fare * r.booked_seats, 0);

    return {
      total_users: users.length,
      total_drivers: drivers.length,
      total_buses: buses.length,
      active_rides: rides.filter((r) => r.status === 'active' || r.status === 'boarding').length,
      scheduled_rides: rides.filter((r) => r.status === 'scheduled').length,
      completed_rides: rides.filter((r) => r.status === 'completed').length,
      cancelled_rides: rides.filter((r) => r.status === 'cancelled').length,
      total_bookings: bookings.length,
      revenue,
      pending_payments: bookings.filter((b) => b.status === 'pending').length,
      successful_payments: bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
      failed_payments: 0,
      referral_usage: 0,
    };
  },

  getRevenueChart: async (range: string) => {
    try {
      const { data } = await walletClient.get('/api/v1/wallet/analytics', { params: { range } });
      return data;
    } catch {
      return generateMockChartData(range);
    }
  },

  getBookingsChart: async (range: string) => {
    try {
      const { data } = await bookingClient.get('/api/v1/analytics/bookings', { params: { range } });
      return data;
    } catch {
      return generateMockChartData(range);
    }
  },
};

function generateMockChartData(range: string) {
  const labels =
    range === 'today'
      ? Array.from({ length: 24 }, (_, i) => `${i}:00`)
      : range === 'week'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : range === 'month'
      ? Array.from({ length: 30 }, (_, i) => `${i + 1}`)
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return labels.map((label) => ({
    label,
    revenue: Math.floor(Math.random() * 500000) + 50000,
    bookings: Math.floor(Math.random() * 100) + 10,
  }));
}
