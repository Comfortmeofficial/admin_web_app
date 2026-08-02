import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, Power, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { rewardClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatsCard } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { Gift, TrendingUp, Users, Percent } from 'lucide-react';
import type { ReferralCode, CreateReferralCodePayload } from '@/types';

export function ReferralsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteCode, setDeleteCode] = useState<ReferralCode | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['referral-codes'],
    queryFn: async () => {
      const { data } = await rewardClient.get('/api/v1/referrals/');
      return data as ReferralCode[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateReferralCodePayload) => {
      const { data } = await rewardClient.post('/api/v1/referrals/', payload);
      return data as ReferralCode;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referral-codes'] }); toast.success('Code created'); setShowCreate(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => { await rewardClient.delete(`/api/v1/referrals/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referral-codes'] }); toast.success('Code deactivated'); setDeleteCode(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = codes.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsage = codes.reduce((sum, c) => sum + c.uses_count, 0);
  const activeCodes = codes.filter((c) => c.is_active).length;

  const columns: Column<ReferralCode>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (row) => <span className="font-mono font-semibold text-primary-700">{row.code}</span>,
    },
    {
      key: 'discount',
      header: 'Discount',
      cell: (r) => r.discount_percent ? `${r.discount_percent}%` : r.flat_amount ? `₦${r.flat_amount}` : '—',
    },
    { key: 'uses', header: 'Uses', cell: (r) => `${r.uses_count}${r.max_uses ? ` / ${r.max_uses}` : ''}` },
    { key: 'expiry', header: 'Expires', cell: (r) => r.expiry_date ? formatDate(r.expiry_date) : 'Never' },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.is_active ? 'active' : 'inactive')} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === row.id ? null : row.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <MoreVertical className="w-4 h-4" />
          </button>
          {actionMenu === row.id && (
            <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[160px] py-1">
              {row.is_active && (
                <button onClick={() => { setDeleteCode(row); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><Power className="w-3.5 h-3.5" /> Deactivate</button>
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
      <Header title="Referral Management" subtitle="Create and manage referral codes and rewards" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Codes" value={codes.length} icon={<Gift className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-100" />
          <StatsCard label="Active Codes" value={activeCodes} icon={<TrendingUp className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatsCard label="Total Usage" value={totalUsage} icon={<Users className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
          <StatsCard label="Avg Discount" value={`${codes.reduce((s, c) => s + (c.discount_percent ?? 0), 0) / Math.max(codes.length, 1)}%`} icon={<Percent className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Referral Codes</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search codes…" className="w-48" />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Create Code</Button>
            </div>
          </div>
          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No referral codes" />
        </div>
      </div>

      <ReferralCodeForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />

      <ConfirmDialog
        open={!!deleteCode}
        onClose={() => setDeleteCode(null)}
        onConfirm={() => deleteCode && deactivateMutation.mutate(deleteCode.id)}
        loading={deactivateMutation.isPending}
        confirmLabel="Deactivate"
        message={`Deactivate code "${deleteCode?.code}"?`}
      />
    </div>
  );
}

function ReferralCodeForm({ open, onClose, onSubmit, loading }: { open: boolean; onClose: () => void; onSubmit: (p: CreateReferralCodePayload) => void; loading?: boolean }) {
  const { register, handleSubmit, reset } = useForm<CreateReferralCodePayload>();
  const submit = handleSubmit((data) => onSubmit({
    ...data,
    discount_percent: data.discount_percent ? Number(data.discount_percent) : undefined,
    flat_amount: data.flat_amount ? Number(data.flat_amount) : undefined,
    max_uses: data.max_uses ? Number(data.max_uses) : undefined,
  }));
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Create Referral Code" size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Create Code</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Code (leave blank to auto-generate)" placeholder="SUMMER20" {...register('code')} hint="Must be unique. Letters/numbers only." />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Discount %" type="number" min={0} max={100} {...register('discount_percent')} placeholder="e.g. 20" />
          <Input label="Flat Amount (₦)" type="number" {...register('flat_amount')} placeholder="e.g. 500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Max Uses" type="number" {...register('max_uses')} placeholder="Unlimited" />
          <Input label="Expiry Date" type="date" {...register('expiry_date')} />
        </div>
      </div>
    </Modal>
  );
}
