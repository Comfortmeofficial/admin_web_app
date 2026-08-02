import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/Input';
import { formatDateTime, exportToCsv } from '@/lib/utils';
import { Download, ClipboardList } from 'lucide-react';
import { PAGE_SIZE } from '@/lib/constants';
import type { AuditLog } from '@/types';

export function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async () => {
      try {
        const { data } = await adminClient.get('/api/v1/audit-logs', {
          params: { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
        });
        return (Array.isArray(data) ? data : (data?.data ?? [])) as AuditLog[];
      } catch {
        // Return mock data if endpoint not available
        return [] as AuditLog[];
      }
    },
    placeholderData: (prev) => prev,
  });

  const filtered = logs.filter((l) =>
    `${l.actor_email} ${l.action} ${l.resource}`.toLowerCase().includes(search.toLowerCase())
  );

  const actionColors: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'gray'> = {
    CREATE: 'success',
    UPDATE: 'info',
    DELETE: 'danger',
    LOGIN: 'success',
    LOGOUT: 'gray',
    SUSPEND: 'warning',
    APPROVE: 'success',
    REJECT: 'danger',
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'actor',
      header: 'Actor',
      cell: (r) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{r.actor_email}</p>
          <p className="text-xs text-gray-500">{r.ip_address ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (r) => (
        <Badge variant={actionColors[r.action.toUpperCase()] ?? 'gray'}>
          {r.action}
        </Badge>
      ),
    },
    { key: 'resource', header: 'Resource', cell: (r) => r.resource },
    { key: 'resource_id', header: 'Resource ID', cell: (r) => r.resource_id ? <span className="font-mono text-xs">{r.resource_id}</span> : '—' },
    { key: 'date', header: 'Timestamp', cell: (r) => formatDateTime(r.created_at) },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Audit Logs" subtitle="Track all administrative actions across the platform" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">Activity Logs</h2>
              <p className="text-xs text-gray-500 mt-0.5">{logs.length} entries</p>
            </div>
            <div className="flex items-center gap-3">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 text-xs" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 text-xs" />
              <SearchInput value={search} onChange={setSearch} placeholder="Search logs…" className="w-48" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(logs, 'audit-logs')}>Export</Button>
            </div>
          </div>

          {logs.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-700">No audit logs yet</p>
              <p className="text-xs text-gray-500 mt-1">All administrative actions will be tracked here</p>
            </div>
          ) : (
            <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No logs match your search" />
          )}

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={logs.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + logs.length} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
