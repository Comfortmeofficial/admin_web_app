import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Eye, CheckCircle, XCircle, Power, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { driversApi } from '../api/driversApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage, slugToLabel, exportToCsv } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import type { Driver, CreateDriverPayload, DriverVerificationStatus } from '@/types';

const STATUS_TABS = [
  { key: 'all', label: 'All Drivers' },
  { key: 'pending', label: 'Pending Verification' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export function DriversPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ driver: Driver; action: string } | null>(null);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers', page],
    queryFn: () => driversApi.list({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: driversApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver created');
      setShowCreate(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => driversApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver approved'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => driversApi.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver rejected'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => driversApi.suspend(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver suspended'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const reinstateMutation = useMutation({
    mutationFn: (id: string) => driversApi.reinstate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Driver reinstated'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = drivers.filter((d) => {
    const matchesSearch = `${d.first_name} ${d.last_name} ${d.email} ${d.phone} ${d.license_number}`
      .toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusTab === 'all' || d.verification_status === statusTab;
    return matchesSearch && matchesStatus;
  });

  const handleAction = () => {
    if (!confirm) return;
    const { driver, action } = confirm;
    if (action === 'approve') approveMutation.mutate(driver.id);
    else if (action === 'reject') rejectMutation.mutate(driver.id);
    else if (action === 'suspend') suspendMutation.mutate(driver.id);
    else if (action === 'reinstate') reinstateMutation.mutate(driver.id);
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending || reinstateMutation.isPending;

  const columns: Column<Driver>[] = [
    {
      key: 'driver',
      header: 'Driver',
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
    { key: 'phone', header: 'Phone', cell: (r) => r.phone },
    { key: 'license', header: 'License', cell: (r) => <span className="font-mono text-xs">{r.license_number}</span> },
    { key: 'license_expiry', header: 'License Expiry', cell: (r) => formatDate(r.license_expiry) },
    {
      key: 'verification',
      header: 'Verification',
      cell: (r) => (
        <Badge variant={statusBadge(r.verification_status)} dot>
          {slugToLabel(r.verification_status)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Availability',
      cell: (r) => (
        <Badge variant={statusBadge(r.status)} dot>
          {slugToLabel(r.status)}
        </Badge>
      ),
    },
    { key: 'rating', header: 'Rating', cell: (r) => r.rating ? `⭐ ${r.rating.toFixed(1)}` : '—' },
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
            <div className="absolute right-0 top-8 z-10 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[168px] py-1">
              <button onClick={() => { navigate(`/drivers/${row.id}`); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"><Eye className="w-3.5 h-3.5" /> View Profile</button>
              {row.verification_status === 'pending' || row.verification_status === 'under_review' ? (
                <>
                  <button onClick={() => { setConfirm({ driver: row, action: 'approve' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 w-full"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => { setConfirm({ driver: row, action: 'reject' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                </>
              ) : null}
              {row.verification_status === 'approved' && row.status !== 'suspended' ? (
                <button onClick={() => { setConfirm({ driver: row, action: 'suspend' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 w-full"><Power className="w-3.5 h-3.5" /> Suspend</button>
              ) : null}
              {row.status === 'suspended' ? (
                <button onClick={() => { setConfirm({ driver: row, action: 'reinstate' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 w-full"><Power className="w-3.5 h-3.5" /> Reinstate</button>
              ) : null}
            </div>
          )}
        </div>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Driver Management" subtitle="Manage driver onboarding, verification, and operations" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">All Drivers</h2>
              <p className="text-xs text-gray-500 mt-0.5">{drivers.length} drivers</p>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search drivers…" className="w-56" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(drivers, 'drivers')}>Export</Button>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Add Driver</Button>
            </div>
          </div>

          <div className="px-5 pt-3 border-b border-gray-100">
            <Tabs tabs={STATUS_TABS} active={statusTab} onChange={(k) => { setStatusTab(k); setPage(1); }} />
          </div>

          <Table
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/drivers/${r.id}`)}
            emptyMessage="No drivers found"
          />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={drivers.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + drivers.length} onChange={setPage} />
          </div>
        </div>
      </div>

      <DriverForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={isPending}
        confirmVariant={confirm?.action === 'approve' || confirm?.action === 'reinstate' ? 'primary' : 'danger'}
        confirmLabel={confirm?.action ? slugToLabel(confirm.action) : 'Confirm'}
        message={`Are you sure you want to ${confirm?.action} driver "${confirm?.driver.first_name} ${confirm?.driver.last_name}"?`}
      />
    </div>
  );
}

interface DriverFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CreateDriverPayload) => void;
  loading?: boolean;
  defaultValues?: Partial<Driver>;
  isEdit?: boolean;
}

export function DriverForm({ open, onClose, onSubmit, loading, defaultValues, isEdit }: DriverFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateDriverPayload>({
    defaultValues: {
      first_name: defaultValues?.first_name ?? '',
      last_name: defaultValues?.last_name ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      address: defaultValues?.address ?? '',
      emergency_contact: defaultValues?.emergency_contact ?? '',
      next_of_kin: defaultValues?.next_of_kin ?? '',
      license_number: defaultValues?.license_number ?? '',
      license_expiry: defaultValues?.license_expiry?.split('T')[0] ?? '',
      driver_type: defaultValues?.driver_type ?? '',
    },
  });

  const submit = handleSubmit((data) => onSubmit(data));

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title={isEdit ? 'Edit Driver' : 'Add New Driver'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} loading={loading}>{isEdit ? 'Save Changes' : 'Create Driver'}</Button>
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
          <Input label="Phone" required {...register('phone', { required: 'Required' })} error={errors.phone?.message} />
        </div>
        <Input label="Address" {...register('address')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Emergency Contact" {...register('emergency_contact')} />
          <Input label="Next of Kin" {...register('next_of_kin')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="License Number" required {...register('license_number', { required: 'Required' })} error={errors.license_number?.message} />
          <Input label="License Expiry" type="date" required {...register('license_expiry', { required: 'Required' })} error={errors.license_expiry?.message} />
        </div>
        <Select
          label="Driver Type"
          options={[
            { value: 'intercity', label: 'Intercity' },
            { value: 'intrastate', label: 'Intrastate' },
            { value: 'shuttle', label: 'Shuttle' },
          ]}
          placeholder="Select driver type"
          {...register('driver_type')}
        />
      </div>
    </Modal>
  );
}
