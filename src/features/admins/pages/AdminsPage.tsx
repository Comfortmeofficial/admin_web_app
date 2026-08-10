import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, ShieldCheck, Pencil, Trash2, Power } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { adminsApi } from '../api/adminsApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { SearchInput } from '@/components/ui/SearchInput';
import { formatDate, getErrorMessage, slugToLabel } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';
import type { Admin, AdminRole, CreateAdminPayload } from '@/types';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'finance_officer', label: 'Finance Officer' },
  { value: 'bus_marshal', label: 'Bus Marshal' },
];

export function AdminsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [deleteAdmin, setDeleteAdmin] = useState<Admin | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminsApi.list({ skip: 0, limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: adminsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin created successfully');
      setShowCreate(false);
    },
    onError: (e) => toast.error('Failed to create admin', getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof adminsApi.update>[1] }) =>
      adminsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin updated');
      setEditAdmin(null);
    },
    onError: (e) => toast.error('Failed to update', getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: adminsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      toast.success('Admin deleted');
      setDeleteAdmin(null);
    },
    onError: (e) => toast.error('Failed to delete', getErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? adminsApi.activate(id) : adminsApi.suspend(id),
    onSuccess: (_, { active }) => {
      qc.invalidateQueries({ queryKey: ['admins'] });
      toast.success(active ? 'Admin activated' : 'Admin suspended');
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = admins.filter(
    (a) =>
      `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Admin>[] = [
    {
      key: 'name',
      header: 'Admin',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold flex-shrink-0">
            {row.first_name[0]}{row.last_name[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.first_name} {row.last_name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (row) => (
        <Badge variant="info">
          <ShieldCheck className="w-3 h-3" />
          {ROLE_LABELS[row.role] ?? row.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={statusBadge(row.is_active ? 'active' : 'suspended')} dot>
          {row.is_active ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      cell: (row) => <span className="text-gray-500">{formatDate(row.created_at)}</span>,
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
            <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[160px] py-1">
              <button onClick={() => { setEditAdmin(row); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => { toggleMutation.mutate({ id: row.id, active: !row.is_active }); setActionMenu(null); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
              >
                <Power className="w-3.5 h-3.5" /> {row.is_active ? 'Suspend' : 'Activate'}
              </button>
              <button onClick={() => { setDeleteAdmin(row); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                <Trash2 className="w-3.5 h-3.5" /> Delete
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
      <Header title="Admin Management" subtitle="Manage administrative users and their roles" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">All Admins</h2>
              <p className="text-xs text-gray-500 mt-0.5">{filtered.length} administrators</p>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search admins…" className="w-56" />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                Add Admin
              </Button>
            </div>
          </div>
          <Table
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(r) => r.id}
            emptyMessage="No admins found"
          />
        </div>
      </div>

      {/* Create Admin Modal */}
      <AdminForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(p) => createMutation.mutate(p)}
        loading={createMutation.isPending}
      />

      {/* Edit Admin Modal */}
      <AdminForm
        open={!!editAdmin}
        onClose={() => setEditAdmin(null)}
        onSubmit={(p) =>
          updateMutation.mutate({ id: editAdmin!.id, payload: p })
        }
        loading={updateMutation.isPending}
        defaultValues={editAdmin ?? undefined}
        isEdit
      />

      <ConfirmDialog
        open={!!deleteAdmin}
        onClose={() => setDeleteAdmin(null)}
        onConfirm={() => deleteMutation.mutate(deleteAdmin!.id)}
        loading={deleteMutation.isPending}
        message={`Delete admin "${deleteAdmin?.first_name} ${deleteAdmin?.last_name}"? This cannot be undone.`}
      />
    </div>
  );
}

interface AdminFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdminPayload) => void;
  loading?: boolean;
  defaultValues?: Partial<Admin>;
  isEdit?: boolean;
}

function AdminForm({ open, onClose, onSubmit, loading, defaultValues, isEdit }: AdminFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAdminPayload>({
    defaultValues: {
      email: defaultValues?.email ?? '',
      first_name: defaultValues?.first_name ?? '',
      last_name: defaultValues?.last_name ?? '',
      role: (defaultValues?.role as AdminRole) ?? 'admin',
      password: '',
    },
  });

  const submit = handleSubmit((data) => onSubmit(data));

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title={isEdit ? 'Edit Admin' : 'Add New Admin'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} loading={loading}>{isEdit ? 'Save Changes' : 'Create Admin'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" required {...register('first_name', { required: 'Required' })} error={errors.first_name?.message} />
          <Input label="Last Name" required {...register('last_name', { required: 'Required' })} error={errors.last_name?.message} />
        </div>
        <Input label="Email" type="email" required {...register('email', { required: 'Required' })} error={errors.email?.message} />
        {!isEdit && (
          <Input label="Password" type="password" required {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} error={errors.password?.message} />
        )}
        <Select
          label="Role"
          required
          options={ROLE_OPTIONS}
          {...register('role', { required: 'Required' })}
          error={errors.role?.message}
        />
      </div>
    </Modal>
  );
}
