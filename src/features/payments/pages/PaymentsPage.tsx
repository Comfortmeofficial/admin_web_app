import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../api/paymentsApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { StatsCard } from '@/components/ui/Tabs';
import { formatDateTime, formatCurrency, slugToLabel, exportToCsv } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import { Download, CheckCircle2, Clock, XCircle, Wallet } from 'lucide-react';
import type { Payment, PaymentMethod, PaymentPurpose, PaymentStatus } from '@/types';

// The Paystack/refund ledger — distinct from the Wallet Transactions page
// (features/wallet-transactions), which is each wallet's own internal
// movement. A row here is either money that actually went through Paystack,
// or a refund; paying a booking/package/rental *from* an already-funded
// wallet has no row here — see the backend's payments/types.ts for why.
const STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  pending: 'warning',
  successful: 'success',
  failed: 'danger',
};

const PURPOSE_OPTIONS: { value: PaymentPurpose; label: string }[] = [
  { value: 'wallet_funding', label: 'Wallet Funding' },
  { value: 'booking_payment', label: 'Booking Payment' },
  { value: 'package_payment', label: 'Package Payment' },
  { value: 'rental_payment', label: 'Rental Payment' },
  { value: 'refund', label: 'Refund' },
  { value: 'other', label: 'Other' },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'wallet', label: 'Wallet' },
];

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'successful', label: 'Successful' },
  { value: 'failed', label: 'Failed' },
];

export function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | ''>('');
  const [purpose, setPurpose] = useState<PaymentPurpose | ''>('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', page, status, purpose, method, from, to],
    queryFn: () => paymentsApi.list({
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      status: status || undefined,
      purpose: purpose || undefined,
      payment_method: method || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  const filtered = payments.filter((p) =>
    `${p.reference} ${p.user_id} ${p.booking_id ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const successful = payments.filter((p) => p.status === 'successful');
  const pending = payments.filter((p) => p.status === 'pending');
  const failed = payments.filter((p) => p.status === 'failed');
  const successfulAmount = successful.reduce((sum, p) => sum + p.amount, 0);

  const resetFilters = () => { setStatus(''); setPurpose(''); setMethod(''); setFrom(''); setTo(''); setPage(1); };

  const columns: Column<Payment>[] = [
    { key: 'ref', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'user', header: 'User', cell: (r) => r.user_id },
    { key: 'amount', header: 'Amount', cell: (r) => <span className="font-medium text-gray-900">{formatCurrency(r.amount)}</span> },
    { key: 'purpose', header: 'Purpose', cell: (r) => slugToLabel(r.purpose) },
    { key: 'method', header: 'Method', cell: (r) => slugToLabel(r.payment_method) },
    {
      key: 'booking', header: 'Booking',
      cell: (r) => r.booking_id ? <span className="font-mono text-xs">#{r.booking_id}</span> : <span className="text-gray-400">—</span>,
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={STATUS_VARIANTS[r.status]} dot>{slugToLabel(r.status)}</Badge>,
    },
    { key: 'initiated', header: 'Initiated', cell: (r) => formatDateTime(r.initiated_at) },
    { key: 'completed', header: 'Completed', cell: (r) => r.completed_at ? formatDateTime(r.completed_at) : '—' },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Payments" subtitle="Money that moved through Paystack, plus every refund — with its live outcome" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Successful" value={successful.length} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatsCard label="Pending" value={pending.length} icon={<Clock className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" />
          <StatsCard label="Failed" value={failed.length} icon={<XCircle className="w-5 h-5 text-red-600" />} iconBg="bg-red-100" />
          <StatsCard label="Successful Amount" value={formatCurrency(successfulAmount)} icon={<Wallet className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <Select
              label="Status"
              value={status}
              onChange={(e) => { setStatus(e.target.value as PaymentStatus | ''); setPage(1); }}
              options={STATUS_OPTIONS}
              placeholder="All statuses"
            />
            <Select
              label="Purpose"
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value as PaymentPurpose | ''); setPage(1); }}
              options={PURPOSE_OPTIONS}
              placeholder="All purposes"
            />
            <Select
              label="Method"
              value={method}
              onChange={(e) => { setMethod(e.target.value as PaymentMethod | ''); setPage(1); }}
              options={METHOD_OPTIONS}
              placeholder="All methods"
            />
            <Input label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <Input label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Transactions</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search reference, user, booking…" className="w-64" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(payments, 'payments')}>Export</Button>
            </div>
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No payments found" />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={payments.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + payments.length} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
