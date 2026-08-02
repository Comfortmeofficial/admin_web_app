import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Power, Eye, Download } from 'lucide-react';
import { usersApi } from '../api/usersApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage, exportToCsv } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import type { User } from '@/types';

export function UsersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<{ user: User; action: 'suspend' | 'activate' } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => usersApi.list({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      activate ? usersApi.activate(id) : usersApi.suspend(id),
    onSuccess: (_, { activate }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(activate ? 'User activated' : 'User suspended');
      setConfirmUser(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = users.filter((u) => {
    const matchesSearch = `${u.first_name ?? ''} ${u.last_name ?? ''} ${u.email} ${u.phone ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesVerified =
      filterVerified === 'all' ||
      (filterVerified === 'verified' && u.is_verified) ||
      (filterVerified === 'unverified' && !u.is_verified);
    return matchesSearch && matchesVerified;
  });

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
            {(row.first_name?.[0] ?? row.email[0]).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (row) => row.phone ?? '—' },
    {
      key: 'verified',
      header: 'Verified',
      cell: (row) => (
        <Badge variant={row.is_verified ? 'success' : 'warning'} dot>
          {row.is_verified ? 'Verified' : 'Unverified'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={statusBadge((row.is_active ?? true) ? 'active' : 'suspended')} dot>
          {(row.is_active ?? true) ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    { key: 'joined', header: 'Joined', cell: (row) => <span className="text-gray-500">{formatDate(row.created_at)}</span> },
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
              <button
                onClick={() => { navigate(`/users/${row.id}`); setActionMenu(null); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                <Eye className="w-3.5 h-3.5" /> View Profile
              </button>
              <button
                onClick={() => {
                  setConfirmUser({ user: row, action: (row.is_active ?? true) ? 'suspend' : 'activate' });
                  setActionMenu(null);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                <Power className="w-3.5 h-3.5" />
                {(row.is_active ?? true) ? 'Suspend' : 'Activate'}
              </button>
            </div>
          )}
        </div>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="User Management" subtitle="View and manage all platform users" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">All Users</h2>
              <p className="text-xs text-gray-500 mt-0.5">{users.length} users</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {(['all', 'verified', 'unverified'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterVerified(f)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      filterVerified === f ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder="Search users…" className="w-56" />
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => exportToCsv(users, 'users')}
              >
                Export
              </Button>
            </div>
          </div>

          <Table
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/users/${r.id}`)}
            emptyMessage="No users found"
          />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={users.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + users.length}
              onChange={setPage}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={() =>
          confirmUser && toggleMutation.mutate({
            id: confirmUser.user.id,
            activate: confirmUser.action === 'activate',
          })
        }
        loading={toggleMutation.isPending}
        confirmVariant={confirmUser?.action === 'suspend' ? 'danger' : 'primary'}
        confirmLabel={confirmUser?.action === 'suspend' ? 'Suspend' : 'Activate'}
        message={`Are you sure you want to ${confirmUser?.action} "${confirmUser?.user.email}"?`}
      />
    </div>
  );
}
