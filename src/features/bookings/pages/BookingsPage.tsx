import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eye, XCircle, Download } from 'lucide-react';
import { bookingsApi } from '../api/bookingsApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, formatCurrency, getErrorMessage, slugToLabel, exportToCsv } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import type { Booking } from '@/types';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'completed', label: 'Completed' },
  { key: 'refunded', label: 'Refunded' },
];

export function BookingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState('all');
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', page],
    queryFn: () => bookingsApi.list({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Booking cancelled'); setCancelBooking(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = bookings.filter((b) => {
    const matchesSearch = `${b.reference} ${b.user_id} ${b.ride_id}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusTab === 'all' || b.status === statusTab;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Booking>[] = [
    { key: 'ref', header: 'Reference', cell: (r) => <span className="font-mono text-xs font-semibold">{r.reference}</span> },
    { key: 'seat', header: 'Seat', cell: (r) => <Badge variant="gray">{r.seat_number}</Badge> },
    { key: 'amount', header: 'Amount', cell: (r) => formatCurrency(r.final_amount) },
    { key: 'payment', header: 'Payment', cell: (r) => <Badge variant="gray">{slugToLabel(r.payment_method)}</Badge> },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>,
    },
    { key: 'onboard', header: 'On Board', cell: (r) => <Badge variant={r.is_on_board ? 'success' : 'gray'}>{r.is_on_board ? 'Yes' : 'No'}</Badge> },
    { key: 'date', header: 'Date', cell: (r) => formatDateTime(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/bookings/${row.id}`); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Eye className="w-4 h-4" /></button>
          {row.status !== 'cancelled' && row.status !== 'refunded' && (
            <button onClick={(e) => { e.stopPropagation(); setCancelBooking(row); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><XCircle className="w-4 h-4" /></button>
          )}
        </div>
      ),
      className: 'w-20',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Booking Management" subtitle="View and manage all passenger bookings" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Bookings</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by reference…" className="w-56" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(bookings, 'bookings')}>Export</Button>
            </div>
          </div>

          <div className="px-5 pt-3 border-b border-gray-100">
            <Tabs tabs={STATUS_TABS} active={statusTab} onChange={(k) => { setStatusTab(k); setPage(1); }} />
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/bookings/${r.id}`)} emptyMessage="No bookings found" />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={bookings.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + bookings.length} onChange={setPage} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={() => cancelBooking && cancelMutation.mutate(cancelBooking.id)}
        loading={cancelMutation.isPending}
        message={`Cancel booking "${cancelBooking?.reference}"? This will cancel the booking and may trigger a refund.`}
        confirmLabel="Cancel Booking"
      />
    </div>
  );
}
