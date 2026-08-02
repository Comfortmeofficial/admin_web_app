import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { walletClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { StatsCard } from '@/components/ui/Tabs';
import { formatDateTime, formatCurrency, slugToLabel, exportToCsv } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import { Download, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { WalletTransaction } from '@/types';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Successful' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

export function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState('all');

  // Since no direct "all transactions" endpoint exists in the backend,
  // we use wallet service which has global transaction records
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: async () => {
      try {
        const { data } = await walletClient.get('/api/v1/wallet/transactions', {
          params: { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
        });
        return data as WalletTransaction[];
      } catch {
        return [] as WalletTransaction[];
      }
    },
    placeholderData: (prev) => prev,
  });

  const filtered = transactions.filter((t) => {
    const matchesSearch = `${t.reference} ${t.description}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const columns: Column<WalletTransaction>[] = [
    { key: 'ref', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    { key: 'amount', header: 'Amount', cell: (r) => formatCurrency(r.amount) },
    {
      key: 'type', header: 'Type',
      cell: (r) => <Badge variant="info">{slugToLabel(r.type)}</Badge>,
    },
    { key: 'date', header: 'Date', cell: (r) => formatDateTime(r.created_at) },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Payment Management" subtitle="Monitor transactions, payments, and revenue" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatsCard label="Successful" value="—" icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatsCard label="Pending" value="—" icon={<Clock className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" />
          <StatsCard label="Failed" value="—" icon={<XCircle className="w-5 h-5 text-red-600" />} iconBg="bg-red-100" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Transactions</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search transactions…" className="w-56" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(transactions, 'transactions')}>Export</Button>
            </div>
          </div>

          <div className="px-5 pt-3 border-b border-gray-100">
            <Tabs tabs={STATUS_TABS} active={statusTab} onChange={(k) => { setStatusTab(k); setPage(1); }} />
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No transactions found" />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={transactions.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + transactions.length} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
