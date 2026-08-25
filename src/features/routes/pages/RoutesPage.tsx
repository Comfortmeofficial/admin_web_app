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
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { Location, Destination, Stop } from '@/types';

// Routes stopped being a separate, reusable, admin-managed entity — ride
// creation and recurring schedules now each create their own route inline
// (see RouteFields), so there's nothing left to list/manage here. Stops,
// Locations, and Destinations remain — genuinely reusable pick-lists,
// unrelated to that change.
const TABS = [
  { key: 'stops', label: 'Stops' },
  { key: 'locations', label: 'Locations' },
  { key: 'destinations', label: 'Destinations' },
];

export function RoutesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('stops');
  const [search, setSearch] = useState('');
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [showCreateDestination, setShowCreateDestination] = useState(false);
  const [showCreateStop, setShowCreateStop] = useState(false);
  const [deleteStopItem, setDeleteStopItem] = useState<Stop | null>(null);
  const [deleteLocationItem, setDeleteLocationItem] = useState<Location | null>(null);
  const [deleteDestinationItem, setDeleteDestinationItem] = useState<Destination | null>(null);

  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: routesApi.listLocations });
  const { data: destinations = [] } = useQuery({ queryKey: ['destinations'], queryFn: routesApi.listDestinations });
  const { data: stops = [], isLoading: stopsLoading } = useQuery({ queryKey: ['stops'], queryFn: routesApi.listStops });

  const createLocationMutation = useMutation({
    mutationFn: routesApi.createLocation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Location created'); setShowCreateLocation(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const createDestinationMutation = useMutation({
    mutationFn: routesApi.createDestination,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['destinations'] }); toast.success('Destination created'); setShowCreateDestination(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const createStopMutation = useMutation({
    mutationFn: routesApi.createStop,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stops'] }); toast.success('Stop created'); setShowCreateStop(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteStopMutation = useMutation({
    mutationFn: routesApi.deleteStop,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stops'] }); toast.success('Stop deleted'); setDeleteStopItem(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: routesApi.deleteLocation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); toast.success('Location deleted'); setDeleteLocationItem(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteDestinationMutation = useMutation({
    mutationFn: routesApi.deleteDestination,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['destinations'] }); toast.success('Destination deleted'); setDeleteDestinationItem(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const stopColumns: Column<Stop>[] = [
    {
      key: 'name',
      header: 'Stop Name',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <p className="font-medium text-gray-900">{r.name}</p>
        </div>
      ),
    },
    { key: 'order', header: 'Order', cell: (r) => r.order ?? '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteStopItem(row); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-12',
    },
  ];

  const locationColumns: Column<Location>[] = [
    { key: 'name', header: 'Name', cell: (r) => <p className="font-medium">{r.name}</p> },
    { key: 'state', header: 'State', cell: (r) => r.state ?? '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteLocationItem(row); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-12',
    },
  ];

  const destinationColumns: Column<Destination>[] = [
    { key: 'name', header: 'Name', cell: (r) => <p className="font-medium">{r.name}</p> },
    { key: 'state', header: 'State', cell: (r) => r.state ?? '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteDestinationItem(row); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Routes & Locations" subtitle="Manage travel routes, pickup points, and destinations" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="pt-0">
              <Tabs tabs={TABS} active={tab} onChange={setTab} className="border-0" />
            </div>
            <div className="flex items-center gap-3">
              <Button
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  if (tab === 'stops') setShowCreateStop(true);
                  else if (tab === 'locations') setShowCreateLocation(true);
                  else setShowCreateDestination(true);
                }}
              >
                Add {tab === 'stops' ? 'Stop' : tab === 'locations' ? 'Location' : 'Destination'}
              </Button>
            </div>
          </div>

          {tab === 'stops' && (
            <Table columns={stopColumns} data={stops} loading={stopsLoading} rowKey={(r) => r.id} emptyMessage="No stops defined" />
          )}
          {tab === 'locations' && (
            <Table columns={locationColumns} data={locations} loading={false} rowKey={(r) => r.id} emptyMessage="No locations" />
          )}
          {tab === 'destinations' && (
            <Table columns={destinationColumns} data={destinations} loading={false} rowKey={(r) => r.id} emptyMessage="No destinations" />
          )}
        </div>
      </div>

      {/* Location form */}
      <SimpleNameForm
        open={showCreateLocation}
        onClose={() => setShowCreateLocation(false)}
        onSubmit={(name, state) => createLocationMutation.mutate({ name, state })}
        loading={createLocationMutation.isPending}
        title="Add Location"
      />

      {/* Destination form */}
      <SimpleNameForm
        open={showCreateDestination}
        onClose={() => setShowCreateDestination(false)}
        onSubmit={(name, state) => createDestinationMutation.mutate({ name, state })}
        loading={createDestinationMutation.isPending}
        title="Add Destination"
      />

      {/* Stop form */}
      <StopForm
        open={showCreateStop}
        onClose={() => setShowCreateStop(false)}
        onSubmit={(name, state) => createStopMutation.mutate({ name, state })}
        loading={createStopMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteStopItem}
        onClose={() => setDeleteStopItem(null)}
        onConfirm={() => deleteStopItem && deleteStopMutation.mutate(deleteStopItem.id)}
        loading={deleteStopMutation.isPending}
        message={`Delete stop "${deleteStopItem?.name}"?`}
      />

      <ConfirmDialog
        open={!!deleteLocationItem}
        onClose={() => setDeleteLocationItem(null)}
        onConfirm={() => deleteLocationItem && deleteLocationMutation.mutate(deleteLocationItem.id)}
        loading={deleteLocationMutation.isPending}
        message={`Delete location "${deleteLocationItem?.name}"?`}
      />

      <ConfirmDialog
        open={!!deleteDestinationItem}
        onClose={() => setDeleteDestinationItem(null)}
        onConfirm={() => deleteDestinationItem && deleteDestinationMutation.mutate(deleteDestinationItem.id)}
        loading={deleteDestinationMutation.isPending}
        message={`Delete destination "${deleteDestinationItem?.name}"?`}
      />
    </div>
  );
}

function SimpleNameForm({
  open,
  onClose,
  onSubmit,
  loading,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, state?: string) => void;
  loading?: boolean;
  title: string;
}) {
  const { register, handleSubmit, reset } = useForm<{ name: string; state: string }>();
  const submit = handleSubmit((d) => onSubmit(d.name, d.state));
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title={title} size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Create</Button></>}
    >
      <div className="flex flex-col gap-3">
        <Input label="Name" required {...register('name', { required: true })} />
        <Input label="State" {...register('state')} placeholder="e.g. Lagos" />
      </div>
    </Modal>
  );
}

function StopForm({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, state: string) => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string; state: string }>();
  const submit = handleSubmit((d) => onSubmit(d.name, d.state));
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Add Stop" size="sm"
      footer={<><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Create Stop</Button></>}
    >
      <div className="flex flex-col gap-3">
        <Input
          label="Stop Name"
          required
          placeholder="e.g. Ojota Bus Stop"
          {...register('name', { required: 'Required' })}
          error={errors.name?.message}
        />
        <Input
          label="State"
          required
          placeholder="e.g. Lagos"
          {...register('state', { required: 'Required' })}
          error={errors.state?.message}
        />
      </div>
    </Modal>
  );
}
