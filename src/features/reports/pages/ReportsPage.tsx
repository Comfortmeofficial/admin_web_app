import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart2, Users, Car, BookOpen, CreditCard, Gift } from 'lucide-react';
import { usersApi } from '@/features/users/api/usersApi';
import { driversApi } from '@/features/drivers/api/driversApi';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { exportToCsv } from '@/lib/utils';

interface ReportType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  fetch: () => Promise<Record<string, unknown>[]>;
}

export function ReportsPage() {
  const toast = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: users = [] } = useQuery({ queryKey: ['users-report'], queryFn: () => usersApi.list({ skip: 0, limit: 1000 }) });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers-report'], queryFn: () => driversApi.list({ skip: 0, limit: 1000 }) });
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings-report'], queryFn: () => bookingsApi.list({ skip: 0, limit: 1000 }) });

  const REPORT_TYPES: ReportType[] = [
    {
      id: 'users',
      label: 'Users Report',
      description: 'Complete user list with registration dates and verification status',
      icon: <Users className="w-5 h-5 text-primary-600" />,
      iconBg: 'bg-primary-100',
      fetch: async () => users as unknown as Record<string, unknown>[],
    },
    {
      id: 'drivers',
      label: 'Drivers Report',
      description: 'All drivers with verification status, performance, and assignment data',
      icon: <Car className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      fetch: async () => drivers as unknown as Record<string, unknown>[],
    },
    {
      id: 'bookings',
      label: 'Bookings Report',
      description: 'All bookings with payment method, amount, and status breakdown',
      icon: <BookOpen className="w-5 h-5 text-violet-600" />,
      iconBg: 'bg-violet-100',
      fetch: async () => bookings as unknown as Record<string, unknown>[],
    },
    {
      id: 'revenue',
      label: 'Revenue Report',
      description: 'Revenue summary from completed bookings',
      icon: <CreditCard className="w-5 h-5 text-green-600" />,
      iconBg: 'bg-green-100',
      fetch: async () => bookings.filter((b) => b.status === 'completed') as unknown as Record<string, unknown>[],
    },
    {
      id: 'referrals',
      label: 'Referral Report',
      description: 'Referral code usage analytics and conversion metrics',
      icon: <Gift className="w-5 h-5 text-purple-600" />,
      iconBg: 'bg-purple-100',
      fetch: async () => [],
    },
  ];

  const handleDownload = async (report: ReportType, format: 'csv') => {
    setDownloading(report.id);
    try {
      const data = await report.fetch();
      if (data.length === 0) {
        toast.warning('No data available for this report');
        return;
      }
      exportToCsv(data, `${report.id}-report`);
      toast.success(`${report.label} exported successfully`);
    } catch {
      toast.error('Failed to export report');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports & Analytics" subtitle="Generate and export reports for all platform data" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Date filter */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Date Range Filter</h3>
          <div className="flex items-end gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} containerClassName="flex-1" />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} containerClassName="flex-1" />
            <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</Button>
          </div>
        </Card>

        {/* Report cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_TYPES.map((report) => (
            <Card key={report.id} className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${report.iconBg}`}>
                  {report.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{report.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  loading={downloading === report.id}
                  onClick={() => handleDownload(report, 'csv')}
                  className="flex-1"
                >
                  CSV
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary cards */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Quick Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: users.length },
              { label: 'Total Drivers', value: drivers.length },
              { label: 'Total Bookings', value: bookings.length },
              { label: 'Completed Trips', value: bookings.filter((b) => b.status === 'completed').length },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
