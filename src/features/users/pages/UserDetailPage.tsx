import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, Calendar, Wallet, BookOpen, Shield } from 'lucide-react';
import { usersApi } from '../api/usersApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { Table, type Column } from '@/components/ui/Table';
import { formatDate, formatCurrency, slugToLabel } from '@/lib/utils';
import { useState } from 'react';
import { Card } from '@/components/ui/Tabs';
import type { Booking, WalletTransaction } from '@/types';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'wallet', label: 'Wallet & Payments' },
];

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['user-bookings', id],
    queryFn: () => usersApi.getBookings(id!),
    enabled: !!id && tab === 'bookings',
  });

  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', id],
    queryFn: () => usersApi.getWallet(id!),
    enabled: !!id && tab === 'wallet',
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['user-transactions', id],
    queryFn: () => usersApi.getWalletTransactions(id!),
    enabled: !!id && tab === 'wallet',
  });

  if (isLoading) return <PageSpinner />;
  if (!user) return null;

  const bookingColumns: Column<Booking>[] = [
    { key: 'ref', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'amount', header: 'Amount', cell: (r) => formatCurrency(r.final_amount) },
    { key: 'method', header: 'Method', cell: (r) => <Badge variant="gray">{slugToLabel(r.payment_method)}</Badge> },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>,
    },
    { key: 'date', header: 'Date', cell: (r) => formatDate(r.created_at) },
  ];

  const txColumns: Column<WalletTransaction>[] = [
    { key: 'desc', header: 'Description', cell: (r) => r.description },
    { key: 'amount', header: 'Amount', cell: (r) => formatCurrency(r.amount) },
    { key: 'type', header: 'Type', cell: (r) => <Badge variant="gray">{slugToLabel(r.type)}</Badge> },
    { key: 'ref', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'date', header: 'Date', cell: (r) => formatDate(r.created_at) },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="User Profile" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          Back to Users
        </Button>

        {/* Profile card */}
        <Card className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold flex-shrink-0">
            {(user.first_name?.[0] ?? user.email[0]).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{user.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.is_verified ? 'success' : 'warning'} dot>
                  {user.is_verified ? 'Verified' : 'Unverified'}
                </Badge>
                <Badge variant={statusBadge((user.is_active ?? true) ? 'active' : 'suspended')} dot>
                  {(user.is_active ?? true) ? 'Active' : 'Suspended'}
                </Badge>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {user.phone}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                Joined {formatDate(user.created_at)}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
              <dl className="space-y-3">
                {[
                  { label: 'Full Name', value: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || '—' },
                  { label: 'Email', value: user.email },
                  { label: 'Phone', value: user.phone ?? '—' },
                  { label: 'User ID', value: user.id },
                  { label: 'Joined', value: formatDate(user.created_at) },
                  { label: 'Last Updated', value: formatDate(user.updated_at) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Account Status</h3>
              <dl className="space-y-3">
                {[
                  { label: 'Account Status', value: <Badge variant={statusBadge((user.is_active ?? true) ? 'active' : 'suspended')} dot>{(user.is_active ?? true) ? 'Active' : 'Suspended'}</Badge> },
                  { label: 'Email Verified', value: <Badge variant={user.is_verified ? 'success' : 'warning'} dot>{user.is_verified ? 'Yes' : 'No'}</Badge> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4 items-center">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        )}

        {tab === 'bookings' && (
          <Card padding={false}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Booking History</h3>
            </div>
            <Table
              columns={bookingColumns}
              data={bookings}
              rowKey={(r) => r.id}
              emptyMessage="No bookings yet"
            />
          </Card>
        )}

        {tab === 'wallet' && (
          <div className="space-y-4">
            {wallet && (
              <Card>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Wallet Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(wallet.balance ?? 0)}</p>
                  </div>
                </div>
              </Card>
            )}
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Transaction History</h3>
              </div>
              <Table
                columns={txColumns}
                data={transactions}
                rowKey={(r) => r.id}
                emptyMessage="No transactions yet"
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
