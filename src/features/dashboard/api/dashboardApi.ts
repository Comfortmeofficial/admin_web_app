import { userClient, driverClient, busClient, bookingClient, walletClient, adminClient } from '@/lib/api';
import type { DashboardStats, DateRangeFilter, Ride, Booking, Rental, Marshal } from '@/types';

const LARGE = 1000;

const safeArray = <T>(res: PromiseSettledResult<{ data: unknown }>): T[] => {
  if (res.status === 'fulfilled' && Array.isArray(res.value.data)) return res.value.data as T[];
  return [];
};

// Rentals' own list endpoint isn't always a bare array — mirrors the same
// unwrapping rentalsApi.list does, since this fetches it directly rather
// than through that helper (this whole file already talks to every service
// via raw client.get + safeArray, not through each feature's own api.ts).
const safeRentals = (res: PromiseSettledResult<{ data: unknown }>): Rental[] => {
  if (res.status !== 'fulfilled') return [];
  const { data } = res.value;
  if (Array.isArray(data)) return data as Rental[];
  const wrapped = data as { data?: Rental[]; rentals?: Rental[] };
  return wrapped?.data ?? wrapped?.rentals ?? [];
};

// Mirrors the bucket windows wallet_service's /analytics endpoint uses, so
// the stat cards and the charts below them agree on what "This Week" etc.
// actually spans.
function sinceFor(range: DateRangeFilter): Date | null {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (range === 'today') return todayStart;
  if (range === 'week') return new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (range === 'year') {
    const d = new Date(todayStart);
    d.setUTCMonth(d.getUTCMonth() - 11);
    return d;
  }
  if (range === 'all') return null;
  return new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000); // month / custom
}

function filterSince<T>(items: T[], since: Date | null, getDate: (item: T) => string): T[] {
  if (!since) return items;
  return items.filter((item) => new Date(getDate(item)) >= since);
}

export const dashboardApi = {
  getStats: async (range: DateRangeFilter = 'month'): Promise<DashboardStats> => {
    const [usersRes, driversRes, busesRes, ridesRes, bookingsRes, revenueRes, marshalsRes, rentalsRes] =
      await Promise.allSettled([
        userClient.get('/api/v1/users/', { params: { skip: 0, limit: LARGE } }),
        driverClient.get('/api/v1/drivers/', { params: { skip: 0, limit: LARGE } }),
        busClient.get('/api/v1/buses', { params: { limit: LARGE } }),
        bookingClient.get('/api/v1/rides', { params: { skip: 0, limit: LARGE } }),
        bookingClient.get('/api/v1/bookings/all', { params: { skip: 0, limit: LARGE } }),
        walletClient.get('/api/v1/wallet/analytics', { params: { range } }),
        adminClient.get('/api/v1/admins/marshals'),
        bookingClient.get('/api/v1/rentals', { params: { skip: 0, limit: LARGE, status: 'pending' } }),
      ]);

    const since = sinceFor(range);
    const users = filterSince(
      safeArray<{ created_at: string }>(usersRes as PromiseSettledResult<{ data: unknown }>),
      since,
      (u) => u.created_at,
    );
    const drivers = filterSince(
      safeArray<{ created_at: string }>(driversRes as PromiseSettledResult<{ data: unknown }>),
      since,
      (d) => d.created_at,
    );
    const buses = filterSince(
      safeArray<{ created_at: string }>(busesRes as PromiseSettledResult<{ data: unknown }>),
      since,
      (b) => b.created_at,
    );
    // Rides are anchored to when they depart, not when the row was created —
    // "Scheduled Rides This Week" means rides leaving this week.
    const rides = filterSince(
      safeArray<Ride>(ridesRes as PromiseSettledResult<{ data: unknown }>),
      since,
      (r) => r.departure_time,
    );
    const bookings = filterSince(
      safeArray<Booking>(bookingsRes as PromiseSettledResult<{ data: unknown }>),
      since,
      (b) => b.created_at,
    );
    // Sourced from wallet_service's actual successful transactions (same
    // data the revenue chart uses), not ride fares — a ride only counts
    // toward revenue once its status flips to "completed", which understates
    // (often to zero) money already collected for active/scheduled rides.
    // The endpoint is already scoped server-side to the same `range`.
    const revenueBuckets = safeArray<{ revenue: number }>(revenueRes as PromiseSettledResult<{ data: unknown }>);
    const revenue = revenueBuckets.reduce((sum, b) => sum + (b.revenue ?? 0), 0);
    const marshals = safeArray<Marshal>(marshalsRes as PromiseSettledResult<{ data: unknown }>);
    // Server-side filtered to status=pending already; not date-scoped by
    // `range` like the rest of this endpoint — a pending request stays
    // relevant to an admin regardless of when it came in.
    const pendingRentals = safeRentals(rentalsRes as PromiseSettledResult<{ data: unknown }>);

    return {
      total_users: users.length,
      total_drivers: drivers.length,
      total_buses: buses.length,
      total_marshals: marshals.length,
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
      pending_rentals: pendingRentals.length,
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
