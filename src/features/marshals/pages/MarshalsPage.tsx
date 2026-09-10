import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Eye, Power, Download, Trash2, KeyRound, LogOut } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { adminsApi } from '@/features/admins/api/adminsApi';
import { busesApi } from '@/features/buses/api/busesApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage, slugToLabel, exportToCsv } from '@/lib/utils';
import { marshalTripStatus } from '@/types';
import type { Marshal, CreateAdminPayload } from '@/types';

const STATUS_TABS = [
  { key: 'all', label: 'All Marshals' },
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'suspended', label: 'Suspended' },
];

export function MarshalsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { admin } = useAuth();
  const isSuperAdmin = admin?.role === 'super_admin';
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ marshal: Marshal; action: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<{ marshal: Marshal; password: string } | null>(null);

  const { data: marshals = [], isLoading } = useQuery({
    queryKey: ['admins', 'marshals'],
    queryFn: () => adminsApi.listMarshals(),
  });

  const { data: buses = [] } = useQuery({
    queryKey: ['buses'],
    queryFn: () => busesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdminPayload) => adminsApi.create({ ...payload, role: 'bus_marshal' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins', 'marshals'] });
      toast.success('Marshal created');
      setShowCreate(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => adminsApi.suspend(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins', 'marshals'] }); toast.success('Marshal suspended'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const reinstateMutation = useMutation({
    mutationFn: (id: string) => adminsApi.activate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins', 'marshals'] }); toast.success('Marshal reinstated'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admins', 'marshals'] }); toast.success('Marshal deleted'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (marshal: Marshal) => adminsApi.resetPassword(marshal.id).then((r) => ({ marshal, password: r.temporary_password })),
    onSuccess: ({ marshal, password }) => { setTempPassword({ marshal, password }); setConfirm(null); },
    onError: (e) => toast.error('Failed to reset password', getErrorMessage(e)),
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (id: string) => adminsApi.forceLogout(id),
    onSuccess: () => { toast.success('Marshal logged out of all sessions'); setConfirm(null); },
    onError: (e) => toast.error('Failed to force logout', getErrorMessage(e)),
  });

  const filtered = marshals.filter((m) => {
    const matchesSearch = `${m.first_name} ${m.last_name} ${m.email}`
      .toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusTab === 'all' || marshalTripStatus(m) === statusTab;
    return matchesSearch && matchesStatus;
  });

  const handleAction = () => {
    if (!confirm) return;
    const { marshal, action } = confirm;
    if (action === 'suspend') suspendMutation.mutate(marshal.id);
    else if (action === 'reinstate') reinstateMutation.mutate(marshal.id);
    else if (action === 'delete') deleteMutation.mutate(marshal.id);
    else if (action === 'reset_password') resetPasswordMutation.mutate(marshal);
    else if (action === 'force_logout') forceLogoutMutation.mutate(marshal.id);
  };

  const isPending = suspendMutation.isPending || reinstateMutation.isPending || deleteMutation.isPending
    || resetPasswordMutation.isPending || forceLogoutMutation.isPending;

  const columns: Column<Marshal>[] = [
    {
      key: 'marshal',
      header: 'Marshal',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
            {row.first_name[0]}{row.last_name[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone ?? '—' },
    {
      key: 'status',
      header: 'Trip Status',
      cell: (r) => {
        const status = marshalTripStatus(r);
        return (
          <Badge variant={statusBadge(status)} dot>
            {slugToLabel(status)}
          </Badge>
        );
      },
    },
    {
      key: 'assigned_bus',
      header: 'Assigned Bus',
      cell: (r) => {
        if (r.assigned_bus_ids.length === 0) return <span className="text-gray-400">—</span>;
        const plates = r.assigned_bus_ids.map((busId) => buses.find((b) => b.id === busId)?.plate_number ?? busId);
        return plates.join(', ');
      },
    },
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
            <div className="fixed right-3  z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[168px] py-1">
              <button onClick={() => { navigate(`/marshals/${row.id}`); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"><Eye className="w-3.5 h-3.5" /> View Profile</button>
              {row.is_active ? (
                <button onClick={() => { setConfirm({ marshal: row, action: 'suspend' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 w-full"><Power className="w-3.5 h-3.5" /> Suspend</button>
              ) : (
                <button onClick={() => { setConfirm({ marshal: row, action: 'reinstate' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 w-full"><Power className="w-3.5 h-3.5" /> Reinstate</button>
              )}
              {isSuperAdmin && (
                <>
                  <button onClick={() => { setConfirm({ marshal: row, action: 'reset_password' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"><KeyRound className="w-3.5 h-3.5" /> Reset Password</button>
                  <button onClick={() => { setConfirm({ marshal: row, action: 'force_logout' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"><LogOut className="w-3.5 h-3.5" /> Force Logout</button>
                </>
              )}
              <button onClick={() => { setConfirm({ marshal: row, action: 'delete' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
          )}
        </div>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Bus Marshal Management" subtitle="Manage bus marshals and operations" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">All Bus Marshals</h2>
              <p className="text-xs text-gray-500 mt-0.5">{marshals.length} marshals</p>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search marshals…" className="w-56" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(marshals, 'bus-marshals')}>Export</Button>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Add Marshal</Button>
            </div>
          </div>

          <div className="px-5 pt-3 border-b border-gray-100">
            <Tabs tabs={STATUS_TABS} active={statusTab} onChange={setStatusTab} />
          </div>

          <Table
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/marshals/${r.id}`)}
            emptyMessage="No marshals found"
          />
        </div>
      </div>

      <MarshalForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={isPending}

        confirmVariant={confirm?.action === 'reinstate' ? 'primary' : 'danger'}
        confirmLabel={confirm?.action ? slugToLabel(confirm.action) : 'Confirm'}
        message={
          confirm?.action === 'delete'
            ? `Delete marshal "${confirm?.marshal.first_name} ${confirm?.marshal.last_name}"? This removes them from active use — for marshals who are no longer with the company.`
            : confirm?.action === 'reset_password'
            ? `Reset the password for "${confirm?.marshal.first_name} ${confirm?.marshal.last_name}"? A new temporary password will be generated — the old one stops working immediately.`
            : confirm?.action === 'force_logout'
            ? `Force logout "${confirm?.marshal.first_name} ${confirm?.marshal.last_name}"? Any session they're currently signed into stops working immediately.`
            : `Are you sure you want to ${confirm?.action} marshal "${confirm?.marshal.first_name} ${confirm?.marshal.last_name}"?`
        }
      />

      <Modal
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title="Temporary Password"
        size="sm"
        footer={<Button onClick={() => setTempPassword(null)}>Done</Button>}
      >
        <p className="text-sm text-gray-600 mb-3">
          New temporary password for <strong>{tempPassword?.marshal.first_name} {tempPassword?.marshal.last_name}</strong> — copy it now, it won't be shown again.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono select-all">
            {tempPassword?.password}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (tempPassword) navigator.clipboard.writeText(tempPassword.password); toast.success('Copied to clipboard'); }}
          >
            Copy
          </Button>
        </div>
      </Modal>
    </div>
  );
}

interface MarshalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CreateAdminPayload) => void;
  loading?: boolean;
  defaultValues?: Partial<Marshal>;
  isEdit?: boolean;
}

export function MarshalForm({ open, onClose, onSubmit, loading, defaultValues, isEdit }: MarshalFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAdminPayload>({
    defaultValues: {
      first_name: defaultValues?.first_name ?? '',
      last_name: defaultValues?.last_name ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      address: defaultValues?.address ?? '',
      next_of_kin: defaultValues?.next_of_kin ?? '',
      next_of_kin_phone: defaultValues?.next_of_kin_phone ?? '',
      next_of_kin_relationship: defaultValues?.next_of_kin_relationship ?? '',
      password: '',
    },
  });

  const submit = handleSubmit((data) => onSubmit(data));

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title={isEdit ? 'Edit Marshal' : 'Add New Marshal'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} loading={loading}>{isEdit ? 'Save Changes' : 'Create Marshal'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" required {...register('first_name', { required: 'Required' })} error={errors.first_name?.message} />
          <Input label="Last Name" required {...register('last_name', { required: 'Required' })} error={errors.last_name?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" type="email" required {...register('email', { required: 'Required' })} error={errors.email?.message} />
          <Input label="Phone" {...register('phone')} />
        </div>
        <Input label="Address" {...register('address')} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Next of Kin" {...register('next_of_kin')} />
          <Input label="Next of Kin Phone" {...register('next_of_kin_phone')} />
          <Input label="Relationship" placeholder="e.g. Spouse, Mother" {...register('next_of_kin_relationship')} />
        </div>
        {!isEdit && (
          <Input label="Password" type="password" required {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} error={errors.password?.message} />
        )}
      </div>
    </Modal>
  );
}
