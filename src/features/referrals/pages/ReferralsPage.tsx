import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, Power, Trash2, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { rewardClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatsCard, Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import { Gift, TrendingUp, Users, Percent } from 'lucide-react';
import type {
  ReferralCode,
  CreateReferralCodePayload,
  ReferralMilestone,
  MilestoneFormValues,
  MilestoneRewardType,
} from '@/types';

const SUB_TABS = [
  { key: 'codes', label: 'Referral Codes' },
  { key: 'milestones', label: 'Milestones' },
];

export function ReferralsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [subTab, setSubTab] = useState('codes');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteCode, setDeleteCode] = useState<ReferralCode | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editMilestone, setEditMilestone] = useState<ReferralMilestone | null>(null);
  const [deleteMilestone, setDeleteMilestone] = useState<ReferralMilestone | null>(null);

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['referral-milestones'],
    queryFn: async () => {
      const { data } = await rewardClient.get('/api/v1/referrals/milestones');
      return data as ReferralMilestone[];
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async (payload: MilestoneFormValues) => {
      const { data } = await rewardClient.post('/api/v1/referrals/milestones', payload);
      return data as ReferralMilestone;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referral-milestones'] }); toast.success('Milestone created'); setShowMilestoneForm(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: MilestoneFormValues }) => {
      const { data } = await rewardClient.put(`/api/v1/referrals/milestones/${id}`, payload);
      return data as ReferralMilestone;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referral-milestones'] }); toast.success('Milestone updated'); setEditMilestone(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: string) => { await rewardClient.delete(`/api/v1/referrals/milestones/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['referral-milestones'] }); toast.success('Milestone deleted'); setDeleteMilestone(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const milestoneColumns: Column<ReferralMilestone>[] = [
    { key: 'threshold', header: 'Referrals', cell: (m) => <span className="font-semibold text-gray-900">{m.threshold}</span> },
    {
      key: 'reward',
      header: 'Reward',
      cell: (m) => m.reward_type === 'percentage' ? `${m.reward_value}% off next trip` : `₦${m.reward_value} off next trip`,
    },
    { key: 'label', header: 'Label', cell: (m) => m.label || '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (m) => <Badge variant={statusBadge(m.is_active ? 'active' : 'inactive')} dot>{m.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      cell: (m) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setEditMilestone(m); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteMilestone(m); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-20',
    },
  ];

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
            <Tabs tabs={SUB_TABS} active={subTab} onChange={setSubTab} className="border-0" />
            <div className="flex items-center gap-3">
              {subTab === 'codes' && (
                <>
                  <SearchInput value={search} onChange={setSearch} placeholder="Search codes…" className="w-48" />
                  <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Create Code</Button>
                </>
              )}
              {subTab === 'milestones' && (
                <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowMilestoneForm(true)}>Add Milestone</Button>
              )}
            </div>
          </div>
          {subTab === 'codes' && (
            <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No referral codes" />
          )}
          {subTab === 'milestones' && (
            <Table
              columns={milestoneColumns}
              data={milestones}
              loading={milestonesLoading}
              rowKey={(m) => m.id}
              emptyMessage="No milestones configured — riders won't see a referral reward ladder yet."
            />
          )}
        </div>
      </div>

      <ReferralCodeForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />

      <MilestoneForm
        open={showMilestoneForm || !!editMilestone}
        onClose={() => { setShowMilestoneForm(false); setEditMilestone(null); }}
        onSubmit={(p) => editMilestone
          ? updateMilestoneMutation.mutate({ id: editMilestone.id, payload: p })
          : createMilestoneMutation.mutate(p)}
        loading={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
        initial={editMilestone}
      />

      <ConfirmDialog
        open={!!deleteCode}
        onClose={() => setDeleteCode(null)}
        onConfirm={() => deleteCode && deactivateMutation.mutate(deleteCode.id)}
        loading={deactivateMutation.isPending}
        confirmLabel="Deactivate"
        message={`Deactivate code "${deleteCode?.code}"?`}
      />

      <ConfirmDialog
        open={!!deleteMilestone}
        onClose={() => setDeleteMilestone(null)}
        onConfirm={() => deleteMilestone && deleteMilestoneMutation.mutate(deleteMilestone.id)}
        loading={deleteMilestoneMutation.isPending}
        confirmVariant="danger"
        message={`Delete the ${deleteMilestone?.threshold}-referral milestone? Riders who already qualified will lose this reward.`}
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

interface MilestoneFormInputs {
  threshold?: number;
  reward_type: MilestoneRewardType;
  reward_value?: number;
  label: string;
  is_active: boolean;
}

function MilestoneForm({
  open,
  onClose,
  onSubmit,
  loading,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: MilestoneFormValues) => void;
  loading?: boolean;
  initial: ReferralMilestone | null;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MilestoneFormInputs>({
    values: initial
      ? {
          threshold: initial.threshold,
          reward_type: initial.reward_type,
          reward_value: initial.reward_value,
          label: initial.label,
          is_active: initial.is_active,
        }
      : { threshold: undefined, reward_type: 'percentage', reward_value: undefined, label: '', is_active: true },
  });
  const submit = handleSubmit((data) => onSubmit({
    threshold: Number(data.threshold),
    reward_type: data.reward_type,
    reward_value: Number(data.reward_value),
    label: data.label,
    is_active: data.is_active,
  }));
  const handleClose = () => { onClose(); reset(); };

  return (
    <Modal open={open} onClose={handleClose} title={initial ? 'Edit Milestone' : 'Add Milestone'} size="md"
      footer={<><Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>{initial ? 'Save Changes' : 'Add Milestone'}</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Referrals Needed"
          type="number"
          min={1}
          required
          placeholder="e.g. 5"
          {...register('threshold', { required: 'Required', valueAsNumber: true })}
          error={errors.threshold?.message}
          hint="How many successful referrals unlock this reward."
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Reward Type"
            options={[{ value: 'percentage', label: 'Percentage off' }, { value: 'flat', label: 'Flat amount off' }]}
            {...register('reward_type', { required: true })}
          />
          <Input
            label="Reward Value"
            type="number"
            min={0}
            required
            placeholder="e.g. 50"
            {...register('reward_value', { required: 'Required', valueAsNumber: true })}
            error={errors.reward_value?.message}
          />
        </div>
        <Input label="Label (optional)" placeholder="e.g. 50% off your next trip" {...register('label')} />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('is_active')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          Active
        </label>
      </div>
    </Modal>
  );
}
