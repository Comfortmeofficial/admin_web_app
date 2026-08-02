import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Eye, Wrench, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { busesApi } from '../api/busesApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage, slugToLabel } from '@/lib/utils';
import type { Bus, CreateBusPayload } from '@/types';

export function BusesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [retireBus, setRetireBus] = useState<Bus | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data: buses = [], isLoading } = useQuery({
    queryKey: ['buses'],
    queryFn: busesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: busesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buses'] });
      toast.success('Bus created');
      setShowCreate(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      busesApi.update(id, { status: status as Bus['status'] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buses'] });
      toast.success('Bus status updated');
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const retireMutation = useMutation({
    mutationFn: busesApi.retire,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buses'] });
      toast.success('Bus retired');
      setRetireBus(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = buses.filter((b) =>
    `${b.plate_number} ${b.model}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Bus>[] = [
    {
      key: 'bus',
      header: 'Bus',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.plate_number}</p>
          <p className="text-xs text-gray-500">{row.model}</p>
        </div>
      ),
    },
    { key: 'capacity', header: 'Capacity', cell: (r) => `${r.capacity} seats` },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>
      ),
    },
    {
      key: 'driver',
      header: 'Driver',
      cell: (r) => r.driver_id ? <Badge variant="info">Assigned</Badge> : <span className="text-gray-400">—</span>,
    },
    { key: 'created', header: 'Added', cell: (r) => <span className="text-gray-500">{formatDate(r.created_at)}</span> },
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
              <button onClick={() => { navigate(`/buses/${row.id}`); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"><Eye className="w-3.5 h-3.5" /> View Details</button>
              {row.status !== 'maintenance' ? (
                <button onClick={() => { updateStatusMutation.mutate({ id: row.id, status: 'maintenance' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 w-full"><Wrench className="w-3.5 h-3.5" /> Set Maintenance</button>
              ) : (
                <button onClick={() => { updateStatusMutation.mutate({ id: row.id, status: 'active' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 w-full"><Wrench className="w-3.5 h-3.5" /> Set Active</button>
              )}
              <button onClick={() => { setRetireBus(row); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><Trash2 className="w-3.5 h-3.5" /> Retire Bus</button>
            </div>
          )}
        </div>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Bus Management" subtitle="Manage fleet and seat configurations" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">Fleet</h2>
              <p className="text-xs text-gray-500 mt-0.5">{filtered.length} buses</p>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search buses…" className="w-48" />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Add Bus</Button>
            </div>
          </div>
          <Table
            columns={columns}
            data={filtered}
            loading={isLoading}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/buses/${r.id}`)}
            emptyMessage="No buses in fleet"
          />
        </div>
      </div>

      <BusForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />

      <ConfirmDialog
        open={!!retireBus}
        onClose={() => setRetireBus(null)}
        onConfirm={() => retireBus && retireMutation.mutate(retireBus.id)}
        loading={retireMutation.isPending}
        message={`Retire bus "${retireBus?.plate_number}"? This will mark it as retired.`}
        confirmLabel="Retire Bus"
      />
    </div>
  );
}

interface BusFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CreateBusPayload) => void;
  loading?: boolean;
  defaultValues?: Partial<Bus>;
}

function BusForm({ open, onClose, onSubmit, loading, defaultValues }: BusFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateBusPayload>({
    defaultValues: { plate_number: defaultValues?.plate_number ?? '', model: defaultValues?.model ?? '', capacity: defaultValues?.capacity ?? 40 },
  });
  const submit = handleSubmit((data) => onSubmit(data));
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Add New Bus" size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Create Bus</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Plate Number" required placeholder="ABC-123-XY" {...register('plate_number', { required: 'Required' })} error={errors.plate_number?.message} />
        <Input label="Bus Model" required placeholder="Toyota Coaster" {...register('model', { required: 'Required' })} error={errors.model?.message} />
        <Input label="Capacity" type="number" {...register('capacity', { valueAsNumber: true })} hint="Will be calculated from seat layout if provided" />
      </div>
    </Modal>
  );
}
