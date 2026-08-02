import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Bus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { rentalsApi } from '../api/rentalsApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatsCard } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage, slugToLabel } from '@/lib/utils';
import type { Rental, RentalStatus } from '@/types';

const STATUS_TABS: { label: string; value: RentalStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Awaiting Payment', value: 'awaiting_payment' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
];

function SetPriceModal({ open, onClose, onSubmit, loading }: { open: boolean; onClose: () => void; onSubmit: (amount: number) => void; loading?: boolean }) {
  const { register, handleSubmit, reset } = useForm<{ amount: string }>();
  const submit = handleSubmit((data) => onSubmit(Number(data.amount)));
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Set Price & Approve" size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Approve</Button></>}
    >
      <Input
        label="Rental Amount (₦)"
        type="number"
        min={0}
        placeholder="e.g. 75000"
        {...register('amount', { required: true, min: 1 })}
      />
    </Modal>
  );
}

export function RentalsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'all'>('all');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ rental: Rental; action: 'reject' | 'complete' | 'cancel' } | null>(null);
  const [priceModalRental, setPriceModalRental] = useState<Rental | null>(null);

  const { data: rentals = [], isLoading } = useQuery({
    queryKey: ['rentals'],
    queryFn: () => rentalsApi.list(),
  });

  const mutate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === 'reject') return rentalsApi.reject(id);
      if (action === 'complete') return rentalsApi.complete(id);
      return rentalsApi.cancel(id);
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['rentals'] });
      toast.success(`Rental ${action}ed`);
      setConfirm(null);
      setActionMenu(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const setPriceMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => rentalsApi.setPrice(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rentals'] });
      toast.success('Rental priced and approved');
      setPriceModalRental(null);
      setActionMenu(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = rentals.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || r.pickup.toLowerCase().includes(q) || r.destination.toLowerCase().includes(q) || r.phone.includes(q) || r.event_type.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pending = rentals.filter((r) => r.status === 'pending').length;
  const confirmed = rentals.filter((r) => r.status === 'confirmed').length;
  const completed = rentals.filter((r) => r.status === 'completed').length;
  const revenue = rentals.filter((r) => r.status === 'completed').reduce((s, r) => s + r.amount, 0);

  const columns: Column<Rental>[] = [
    {
      key: 'route',
      header: 'Route',
      cell: (r) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{r.pickup} → {r.destination}</p>
          <p className="text-xs text-gray-500">{slugToLabel(r.event_type)}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Pick-up',
      cell: (r) => (
        <div>
          <p className="text-sm text-gray-900">{r.pickup_date}</p>
          <p className="text-xs text-gray-500">{r.pickup_time}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      cell: (r) => <span className="text-sm text-gray-700">{r.phone}</span>,
    },
    {
      key: 'trip_type',
      header: 'Trip',
      cell: (r) => <span className="text-sm text-gray-700">{r.is_round_trip ? 'Round Trip' : 'One Way'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (r) => <span className="text-sm font-medium text-gray-900">₦{r.amount.toLocaleString()}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>,
    },
    {
      key: 'created',
      header: 'Requested',
      cell: (r) => <span className="text-sm text-gray-500">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === row.id ? null : row.id); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {actionMenu === row.id && (
            <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[160px] py-1">
              {row.status === 'pending' && (
                <>
                  <button onClick={() => { setPriceModalRental(row); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50 w-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Set Price & Approve
                  </button>
                  <button onClick={() => { setConfirm({ rental: row, action: 'reject' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </>
              )}
              {row.status === 'confirmed' && (
                <>
                  <button onClick={() => { setConfirm({ rental: row, action: 'complete' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 w-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
                  </button>
                  <button onClick={() => { setConfirm({ rental: row, action: 'cancel' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Bus Rentals" subtitle="Manage weekend bus rental requests" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Requests" value={rentals.length} icon={<Bus className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
          <StatsCard label="Pending" value={pending} icon={<Clock className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" />
          <StatsCard label="Confirmed" value={confirmed} icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatsCard label="Revenue" value={`₦${revenue.toLocaleString()}`} icon={<CheckCircle className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-100" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setStatusFilter(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === t.value
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by route, phone…" className="w-56" />
          </div>
          <Table
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(r) => r.id}
            emptyMessage="No rental requests"
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && mutate.mutate({ id: confirm.rental.id, action: confirm.action })}
        loading={mutate.isPending}
        confirmLabel={confirm ? slugToLabel(confirm.action) : ''}
        message={confirm ? `${slugToLabel(confirm.action)} this rental request from ${confirm.rental.pickup} to ${confirm.rental.destination}?` : ''}
        confirmVariant={confirm?.action === 'reject' || confirm?.action === 'cancel' ? 'danger' : 'primary'}
      />

      <SetPriceModal
        open={!!priceModalRental}
        onClose={() => setPriceModalRental(null)}
        onSubmit={(amount) => priceModalRental && setPriceMutation.mutate({ id: priceModalRental.id, amount })}
        loading={setPriceMutation.isPending}
      />
    </div>
  );
}
