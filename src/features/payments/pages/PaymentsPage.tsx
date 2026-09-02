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
import { Download, TrendingUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import type { WalletTransaction } from '@/types';

// There's no dedicated gateway-payments endpoint yet, so this page is really
// the wallet ledger — deposit/refund money in, withdrawal/trip_fare money
// out. It has no `status` field at all, so a Successful/Pending/Failed
// filter can never be more than dead buttons; this filters by direction
// instead, which the data can actually answer. Mirrors the same split the
// customer app's own wallet screen already uses (isCredit in wallet/index.tsx).
function isCredit(type: string) {
  return type === 'deposit' || type === 'refund';
}

const DIRECTION_TABS = [
  { key: 'all', label: 'All' },
  { key: 'credit', label: 'Money In' },
  { key: 'debit', label: 'Money Out' },
];

export function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [directionTab, setDirectionTab] = useState('all');

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
    const matchesDirection =
      directionTab === 'all' || (directionTab === 'credit' ? isCredit(t.type) : !isCredit(t.type));
    const matchesSearch = `${t.reference} ${t.description}`.toLowerCase().includes(search.toLowerCase());
    return matchesDirection && matchesSearch;
  });

  const totalCredits = transactions.filter((t) => isCredit(t.type)).reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const totalDebits = transactions.filter((t) => !isCredit(t.type)).reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const net = totalCredits - totalDebits;

  const columns: Column<WalletTransaction>[] = [
    { key: 'ref', header: 'Reference', cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'description', header: 'Description', cell: (r) => r.description },
    {
      key: 'amount', header: 'Amount',
      cell: (r) => (
        <span className={isCredit(r.type) ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {isCredit(r.type) ? '+' : '−'}{formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: 'type', header: 'Type',
      cell: (r) => <Badge variant={isCredit(r.type) ? 'success' : 'gray'}>{slugToLabel(r.type)}</Badge>,
    },
    { key: 'date', header: 'Date', cell: (r) => formatDateTime(r.created_at) },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Payment Management" subtitle="Wallet ledger — every credit and debit, with a running net" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard label="Total Credits" value={formatCurrency(totalCredits)} icon={<ArrowDownCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatsCard label="Total Debits" value={formatCurrency(totalDebits)} icon={<ArrowUpCircle className="w-5 h-5 text-red-600" />} iconBg="bg-red-100" />
          <StatsCard label="Net" value={formatCurrency(net)} icon={<TrendingUp className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
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
            <Tabs tabs={DIRECTION_TABS} active={directionTab} onChange={(k) => { setDirectionTab(k); setPage(1); }} />
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
