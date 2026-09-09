import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { routesApi } from '../api/routesApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { Location } from '@/types';

// Locations replaces the old Stops/Locations/Destinations three-tab page —
// the admin now manages exactly one place list, and a route's pickup point,
// destination, and stops are all just picked from it (see RouteFields).
// destinations/stops still exist as their own DB tables under the hood (the
// mobile app reads them directly), but the admin never edits them
// directly — createRoute mirrors a picked location into whichever of those
// tables a route role needs (see findOrCreatePlaceIdByLocation backend-side).
export function RoutesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Location | null>(null);

  const { data: locations = [], isLoading } = useQuery({ queryKey: ['locations'], queryFn: routesApi.listLocations });

  const createMutation = useMutation({
    mutationFn: routesApi.createLocation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Location created'); setShowCreate(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: routesApi.deleteLocation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Location deleted'); setDeleteItem(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = locations
    .filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const columns: Column<Location>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <p className="font-medium text-gray-900">{r.name}</p>
        </div>
      ),
    },
    { key: 'state', header: 'State', cell: (r) => r.state ?? '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteItem(row); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Locations" subtitle="Manage the places routes are built from — pickup points, destinations, and stops all draw from this list" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <SearchInput value={search} onChange={setSearch} placeholder="Search locations…" />
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              Add Location
            </Button>
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No locations" />
        </div>
      </div>

      <LocationForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(name, state) => createMutation.mutate({ name, state })}
        loading={createMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        loading={deleteMutation.isPending}
        message={`Delete location "${deleteItem?.name}"?`}
      />
    </div>
  );
}

function LocationForm({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, state?: string) => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string; state: string }>();
  const submit = handleSubmit((d) => onSubmit(d.name, d.state));
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Add Location" size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Create</Button></>}
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Name"
          required
          placeholder="e.g. Ojota Bus Stop"
          {...register('name', { required: 'Required' })}
          error={errors.name?.message}
        />
        <Input label="State" {...register('state')} placeholder="e.g. Lagos" />
      </div>
    </Modal>
  );
}
