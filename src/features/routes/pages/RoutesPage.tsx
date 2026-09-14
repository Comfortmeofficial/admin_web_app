import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pause, Play } from 'lucide-react';
import { routesApi } from '../api/routesApi';
import { RouteFields, emptyRouteDraft } from '../components/RouteFields';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import type { CreateRoutePayload, Route, RouteStatus } from '@/types';

// Routes are created once here and reused by every Schedule/Ride going
// forward (picked by route_id) — this replaced the old behavior where each
// ride/schedule creation inlined its own fresh location/destination/stops
// and never reused anything, even for the exact same direction.
export function RoutesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [route, setRoute] = useState<CreateRoutePayload>(emptyRouteDraft());

  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: routesApi.listLocations });
  const { data: routes = [], isLoading } = useQuery({ queryKey: ['routes'], queryFn: () => routesApi.list() });

  const createMutation = useMutation({
    mutationFn: routesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route created');
      setShowCreate(false);
      setRoute(emptyRouteDraft());
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RouteStatus }) => routesApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); toast.success('Route updated'); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = routes.filter((r) =>
    `${r.name} ${r.location?.name ?? ''} ${r.destination?.name ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleClose = () => { setShowCreate(false); setRoute(emptyRouteDraft()); };

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
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{r.status === 'active' ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
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
      ),
      className: 'w-16',
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
        open={showCreate}
        onClose={handleClose}
        title="Create Route"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(route)}
              loading={createMutation.isPending}
              disabled={!route.name || !route.location_id || !route.destination_id}
            >
              Create Route
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <RouteFields value={route} onChange={setRoute} locations={locations} />
        </div>
      </Modal>
    </div>
  );
}
