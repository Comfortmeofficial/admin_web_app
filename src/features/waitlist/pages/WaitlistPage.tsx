import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { waitlistApi } from '../api/waitlistApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { StatsCard } from '@/components/ui/Tabs';
import { formatDateTime, exportToCsv } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import { Download, UserPlus } from 'lucide-react';
import type { WaitlistEntry } from '@/types';

export function WaitlistPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['waitlist', page],
    queryFn: () => waitlistApi.list({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const filtered = entries.filter((e) =>
    `${e.full_name} ${e.email} ${e.city ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<WaitlistEntry>[] = [
    { key: 'full_name', header: 'Name', cell: (r) => <span className="font-medium text-gray-900">{r.full_name}</span> },
    { key: 'email', header: 'Email', cell: (r) => r.email },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone ?? '—' },
    { key: 'city', header: 'City', cell: (r) => r.city ?? '—' },
    { key: 'occupation', header: 'Occupation', cell: (r) => r.occupation ?? '—' },
    { key: 'commute_days', header: 'Commute Days', cell: (r) => r.commute_days ?? '—' },
    { key: 'preference', header: 'Preference', cell: (r) => r.preference ?? '—' },
    { key: 'joined', header: 'Joined', cell: (r) => formatDateTime(r.created_at) },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Waitlist" subtitle="Everyone who's signed up ahead of launch via the landing page" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard label="On This Page" value={entries.length} icon={<UserPlus className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Waitlist Signups</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, city…" className="w-56" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(entries, 'waitlist')}>Export</Button>
            </div>
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No one has joined the waitlist yet" />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={entries.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + entries.length} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
