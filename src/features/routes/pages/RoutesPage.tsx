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
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { Route, Location, Destination, Stop, CreateRoutePayload } from '@/types';

const TABS = [
  { key: 'routes', label: 'Routes' },
  { key: 'stops', label: 'Stops' },
  { key: 'locations', label: 'Locations' },
  { key: 'destinations', label: 'Destinations' },
];

export function RoutesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('routes');
  const [search, setSearch] = useState('');
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [showCreateDestination, setShowCreateDestination] = useState(false);
  const [showCreateStop, setShowCreateStop] = useState(false);
  const [deleteRoute, setDeleteRoute] = useState<Route | null>(null);

  const { data: routes = [], isLoading: routesLoading } = useQuery({ queryKey: ['routes'], queryFn: () => routesApi.list() });
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: routesApi.listLocations });
  const { data: destinations = [] } = useQuery({ queryKey: ['destinations'], queryFn: routesApi.listDestinations });
  const { data: stops = [], isLoading: stopsLoading } = useQuery({ queryKey: ['stops'], queryFn: routesApi.listStops });

  const createRouteMutation = useMutation({
    mutationFn: routesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Route created'); setShowCreateRoute(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteRouteMutation = useMutation({
    mutationFn: routesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Route deleted'); setDeleteRoute(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

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

  const filteredRoutes = routes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const routeColumns: Column<Route>[] = [
    {
      key: 'route',
      header: 'Route',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.id}</p>
        </div>
      ),
    },
    { key: 'distance', header: 'Distance', cell: (r) => r.distance_km ? `${r.distance_km} km` : '—' },
    { key: 'stops', header: 'Stops', cell: (r) => r.stops?.length ? <Badge variant="info">{r.stops.length} stops</Badge> : '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <button onClick={(e) => { e.stopPropagation(); setDeleteRoute(row); }} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      className: 'w-12',
    },
  ];

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
  ];

  const locationColumns: Column<Location>[] = [
    { key: 'name', header: 'Name', cell: (r) => <p className="font-medium">{r.name}</p> },
    { key: 'state', header: 'State', cell: (r) => r.state ?? '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
  ];

  const destinationColumns: Column<Destination>[] = [
    { key: 'name', header: 'Name', cell: (r) => <p className="font-medium">{r.name}</p> },
    { key: 'state', header: 'State', cell: (r) => r.state ?? '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
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
              {tab === 'routes' && <SearchInput value={search} onChange={setSearch} placeholder="Search routes…" className="w-48" />}
              <Button
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  if (tab === 'routes') setShowCreateRoute(true);
                  else if (tab === 'stops') setShowCreateStop(true);
                  else if (tab === 'locations') setShowCreateLocation(true);
                  else setShowCreateDestination(true);
                }}
              >
                Add {tab === 'routes' ? 'Route' : tab === 'stops' ? 'Stop' : tab === 'locations' ? 'Location' : 'Destination'}
              </Button>
            </div>
          </div>

          {tab === 'routes' && (
            <Table columns={routeColumns} data={filteredRoutes} loading={routesLoading} rowKey={(r) => r.id} emptyMessage="No routes defined" />
          )}
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

      {/* Route form */}
      <RouteForm
        open={showCreateRoute}
        onClose={() => setShowCreateRoute(false)}
        onSubmit={(p) => createRouteMutation.mutate(p)}
        loading={createRouteMutation.isPending}
        locations={locations}
        destinations={destinations}
        stops={stops}
      />

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
        open={!!deleteRoute}
        onClose={() => setDeleteRoute(null)}
        onConfirm={() => deleteRoute && deleteRouteMutation.mutate(deleteRoute.id)}
        loading={deleteRouteMutation.isPending}
        message={`Delete route "${deleteRoute?.name}"?`}
      />
    </div>
  );
}

interface RouteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CreateRoutePayload) => void;
  loading?: boolean;
  locations: Location[];
  destinations: Destination[];
  stops: Stop[];
}

function RouteForm({ open, onClose, onSubmit, loading, locations, destinations, stops }: RouteFormProps) {
  const [selectedStopIds, setSelectedStopIds] = useState<number[]>([]);
  const [stopFares, setStopFares] = useState<Record<number, string>>({});
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateRoutePayload>();

  const toggleStop = (id: number) => {
    setSelectedStopIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const submit = handleSubmit((data) => onSubmit({
    ...data,
    stops: selectedStopIds.length
      ? selectedStopIds.map((id) => ({
          stop_id: id,
          fare: stopFares[id] ? Number(stopFares[id]) : undefined,
        }))
      : undefined,
  }));

  const handleClose = () => { onClose(); reset(); setSelectedStopIds([]); setStopFares({}); };

  return (
    <Modal open={open} onClose={handleClose} title="Create Route" size="md"
      footer={<><Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Create Route</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Route Name" required placeholder="Lagos — Abuja Express" {...register('name', { required: 'Required' })} error={errors.name?.message} />
        <Select
          label="Pickup Location"
          required
          options={locations.map((l) => ({ value: l.id, label: l.name }))}
          placeholder="Select location"
          {...register('location_id', { required: 'Required', valueAsNumber: true })}
          error={errors.location_id?.message}
        />
        <Select
          label="Destination"
          required
          options={destinations.map((d) => ({ value: d.id, label: d.name }))}
          placeholder="Select destination"
          {...register('destination_id', { required: 'Required', valueAsNumber: true })}
          error={errors.destination_id?.message}
        />
        <Input label="Distance (km)" type="number" {...register('distance_km', { valueAsNumber: true })} />
        {stops.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Pickup Stops <span className="text-gray-400 font-normal">(optional)</span></p>
            <p className="text-xs text-gray-400 mb-2">
              Riders can choose one of these as their pickup point instead of the main location. Set a
              fare for a stop to charge a different price for boarding there — leave it blank to use the
              ride's base fare.
            </p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
              {stops.map((s) => {
                const id = Number(s.id);
                const checked = selectedStopIds.includes(id);
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStop(id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-900 truncate">{s.name}</span>
                      </div>
                    </label>
                    {checked && (
                      <input
                        type="number"
                        min={0}
                        placeholder="Fare (₦)"
                        value={stopFares[id] ?? ''}
                        onChange={(e) => setStopFares((prev) => ({ ...prev, [id]: e.target.value }))}
                        className="w-28 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
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
