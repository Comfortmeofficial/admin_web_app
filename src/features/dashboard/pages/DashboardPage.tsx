import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Car, Bus, Calendar, BookOpen, CreditCard, TrendingUp, Gift,
  Activity, CheckCircle, XCircle, Clock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { dashboardApi } from '../api/dashboardApi';
import { Header } from '@/components/layout/Header';
import { StatsCard, Card } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { DateRangeFilter } from '@/types';

const RANGE_OPTIONS: { label: string; value: DateRangeFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

export function DashboardPage() {
  const [range, setRange] = useState<DateRangeFilter>('month');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', range],
    queryFn: () => dashboardApi.getStats(range),
    staleTime: 60_000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-chart', range],
    queryFn: () => dashboardApi.getRevenueChart(range),
    staleTime: 60_000,
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle="Platform overview and analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Date range filter */}
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg font-medium transition-colors',
                range === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {statsLoading ? (
          <PageSpinner />
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                label="Total Users"
                value={formatNumber(stats?.total_users ?? 0)}
                icon={<Users className="w-5 h-5 text-primary-600" />}
                iconBg="bg-primary-100"
              />
              <StatsCard
                label="Total Drivers"
                value={formatNumber(stats?.total_drivers ?? 0)}
                icon={<Car className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
              />
              <StatsCard
                label="Total Buses"
                value={formatNumber(stats?.total_buses ?? 0)}
                icon={<Bus className="w-5 h-5 text-indigo-600" />}
                iconBg="bg-indigo-100"
              />
              <StatsCard
                label="Total Bookings"
                value={formatNumber(stats?.total_bookings ?? 0)}
                icon={<BookOpen className="w-5 h-5 text-violet-600" />}
                iconBg="bg-violet-100"
              />
              <StatsCard
                label="Active Rides"
                value={formatNumber(stats?.active_rides ?? 0)}
                icon={<Activity className="w-5 h-5 text-green-600" />}
                iconBg="bg-green-100"
              />
              <StatsCard
                label="Scheduled Rides"
                value={formatNumber(stats?.scheduled_rides ?? 0)}
                icon={<Calendar className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
              />
              <StatsCard
                label="Completed Rides"
                value={formatNumber(stats?.completed_rides ?? 0)}
                icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-100"
              />
              <StatsCard
                label="Cancelled Rides"
                value={formatNumber(stats?.cancelled_rides ?? 0)}
                icon={<XCircle className="w-5 h-5 text-red-600" />}
                iconBg="bg-red-100"
              />
            </div>

            {/* Payment stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                label="Total Revenue"
                value={formatCurrency(stats?.revenue ?? 0)}
                icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                iconBg="bg-green-100"
              />
              <StatsCard
                label="Successful Payments"
                value={formatNumber(stats?.successful_payments ?? 0)}
                icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                iconBg="bg-green-100"
              />
              <StatsCard
                label="Pending Payments"
                value={formatNumber(stats?.pending_payments ?? 0)}
                icon={<Clock className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
              />
              <StatsCard
                label="Referral Usage"
                value={formatNumber(stats?.referral_usage ?? 0)}
                icon={<Gift className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-100"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card padding={false}>
                <div className="px-6 pt-5 pb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Revenue Trend</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Total revenue over time</p>
                </div>
                <div className="px-2 pb-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData ?? []}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#revenueGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card padding={false}>
                <div className="px-6 pt-5 pb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Bookings</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Number of bookings over time</p>
                </div>
                <div className="px-2 pb-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

