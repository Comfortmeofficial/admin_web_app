import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package as PackageIcon, Clock, Truck, CheckCircle } from 'lucide-react';
import { packagesApi } from '../api/packagesApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatsCard } from '@/components/ui/Tabs';
import { formatDate, formatCurrency, slugToLabel } from '@/lib/utils';
import type { Package, PackageStatus } from '@/types';

const STATUS_TABS: { label: string; value: PackageStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Pickup', value: 'pending_pickup' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function PackagesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PackageStatus | 'all'>('all');

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list({ limit: 100 }),
  });

  const filtered = packages.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.order_id.toLowerCase().includes(q) ||
      p.recipient_name.toLowerCase().includes(q) ||
      p.recipient_phone.includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingPickup = packages.filter((p) => p.status === 'pending_pickup').length;
  const inTransit = packages.filter((p) => p.status === 'in_transit').length;
  const delivered = packages.filter((p) => p.status === 'delivered').length;

  const columns: Column<Package>[] = [
    {
      key: 'order_id',
      header: 'Order ID',
      cell: (p) => <span className="text-sm font-medium text-gray-900">{p.order_id}</span>,
    },
    {
      key: 'route',
      header: 'Route',
      cell: (p) => (
        <span className="text-sm text-gray-700">
          {p.ride?.route?.location?.name} → {p.ride?.route?.destination?.name}
        </span>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      cell: (p) => (
        <div>
          <p className="text-sm text-gray-900">{p.recipient_name}</p>
          <p className="text-xs text-gray-500">{p.recipient_phone}</p>
        </div>
      ),
    },
    {
      key: 'fare',
      header: 'Fee',
      cell: (p) => <span className="text-sm font-medium text-gray-900">{formatCurrency(p.fare_amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => <Badge variant={statusBadge(p.status)} dot>{slugToLabel(p.status)}</Badge>,
    },
    {
      key: 'created',
      header: 'Sent',
      cell: (p) => <span className="text-sm text-gray-500">{formatDate(p.created_at)}</span>,
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Packages" subtitle="Parcels sent along scheduled rides" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Packages" value={packages.length} icon={<PackageIcon className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
          <StatsCard label="Pending Pickup" value={pendingPickup} icon={<Clock className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" />
          <StatsCard label="In Transit" value={inTransit} icon={<Truck className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
          <StatsCard label="Delivered" value={delivered} icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setStatusFilter(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === t.value ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by order ID, recipient…" className="w-64" />
          </div>
          <Table
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(p) => p.id}
            emptyMessage="No packages sent yet"
          />
        </div>
      </div>
    </div>
  );
}
