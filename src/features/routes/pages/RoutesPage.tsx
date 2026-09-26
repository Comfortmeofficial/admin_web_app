import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pause, Play, Pencil, Trash2 } from 'lucide-react';
import { routesApi } from '../api/routesApi';
import { RouteFields, emptyRouteDraft } from '../components/RouteFields';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import type { CreateRoutePayload, Location, Route, RouteStatus } from '@/types';

// A route as GET /routes returns it can't be fed straight back into a
// create/update payload — destination_id and every stop's stop_id are
// destinations/stops-table ids there, not the locations.id the form (and
// the backend's own create/update input) expects. Re-resolve each one by
// place name against the Locations list instead, same as the backend's own
// findOrCreatePlaceIdByLocation does. Falls back to 0 (nothing pre-selected,
// admin re-picks) rather than risk silently applying a wrong id if a place
// was renamed/removed since.
function routeToDraft(route: Route, locations: Location[]): CreateRoutePayload {
  const idByName = (name: string | undefined) =>
    name ? Number(locations.find((l) => l.name === name)?.id ?? 0) : 0;

  return {
    name: route.name,
    location_id: Number(route.location_id),
    destination_id: idByName(route.destination?.name),
    distance_km: route.distance_km,
    tags: route.tags ?? [],
    stops: (route.stops ?? [])
      .slice()
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((s) => ({ stop_id: idByName(s.stop?.name) })),
  };
}

// Routes are created once here and reused by every Schedule/Ride going
// forward (picked by route_id) — this replaced the old behavior where each
// ride/schedule creation inlined its own fresh location/destination/stops
// and never reused anything, even for the exact same direction.
export function RoutesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Route | null>(null);
  const [deleteItem, setDeleteItem] = useState<Route | null>(null);
  const [route, setRoute] = useState<CreateRoutePayload>(emptyRouteDraft());

  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: routesApi.listLocations });
  const { data: routes = [], isLoading } = useQuery({ queryKey: ['routes'], queryFn: () => routesApi.list() , refetchInterval: 30_000});

  useEffect(() => {
    if (editing) setRoute(routeToDraft(editing, locations));
  }, [editing, locations]);

  const createMutation = useMutation({
    mutationFn: routesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route created', 'The return-direction route was created too, if one didn’t already exist.');
      setShowCreate(false);
      setRoute(emptyRouteDraft());
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateRoutePayload }) => routesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route updated');
      setEditing(null);
      setRoute(emptyRouteDraft());
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RouteStatus }) => routesApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Route updated'); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: routesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route deleted');
      setDeleteItem(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = routes.filter((r) =>
    `${r.name} ${r.location?.name ?? ''} ${r.destination?.name ?? ''} ${(r.tags ?? []).join(' ')}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleClose = () => { setShowCreate(false); setEditing(null); setRoute(emptyRouteDraft()); };

  const columns: Column<Route>[] = [
    {
      key: 'route',
      header: 'Route',
      cell: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.name}</p>
          <p className="text-xs text-gray-500">
            {r.location?.name ?? r.location_id} → {r.destination?.name ?? r.destination_id}
          </p>
        </div>
      ),
    },
    { key: 'distance', header: 'Distance', cell: (r) => r.distance_km != null ? `${r.distance_km} km` : '—' },
    { key: 'stops', header: 'Stops', cell: (r) => r.stops?.length ?? 0 },
    {
      key: 'tags',
      header: 'Tags',
      cell: (r) => (
        <div className="flex flex-wrap gap-1 max-w-[12rem]">
          {(r.tags ?? []).length === 0
            ? <span className="text-gray-300">—</span>
            : r.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">{tag}</span>
              ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{r.status === 'active' ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(row); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              statusMutation.mutate({ id: row.id, status: row.status === 'active' ? 'inactive' : 'active' });
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            title={row.status === 'active' ? 'Mark inactive' : 'Mark active'}
          >
            {row.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteItem(row); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-28',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Routes" subtitle="Create a route once — Schedules and Rides pick from this list instead of re-entering it" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Routes</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search routes…" className="w-56" />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Create Route</Button>
            </div>
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No routes yet" />
        </div>
      </div>

      <Modal
        open={showCreate || !!editing}
        onClose={handleClose}
        title={editing ? 'Edit Route' : 'Create Route'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending || updateMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => editing ? updateMutation.mutate({ id: editing.id, payload: route }) : createMutation.mutate(route)}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!route.name || !route.location_id || !route.destination_id}
            >
              {editing ? 'Save Changes' : 'Create Route'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <RouteFields value={route} onChange={setRoute} locations={locations} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        loading={deleteMutation.isPending}
        message={`Delete route "${deleteItem?.name}"? Schedules and rides that already reference it are unaffected.`}
      />
    </div>
  );
}
