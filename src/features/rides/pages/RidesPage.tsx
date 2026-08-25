import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Eye } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { ridesApi } from '../api/ridesApi';
import { routesApi } from '@/features/routes/api/routesApi';
import { RouteFields, emptyRouteDraft } from '@/features/routes/components/RouteFields';
import { busesApi } from '@/features/buses/api/busesApi';
import { driversApi } from '@/features/drivers/api/driversApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, formatCurrency, getErrorMessage, slugToLabel } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import type { Ride, CreateRidePayload, CreateRoutePayload, RideStatus } from '@/types';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'boarding', label: 'Boarding' },
  { key: 'active', label: 'In Transit' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function RidesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['rides', page, statusTab],
    queryFn: () => ridesApi.list({
      skip: (page - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      status: statusTab === 'all' ? undefined : statusTab,
    }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: ridesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rides'] }); toast.success('Ride created'); setShowCreate(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RideStatus }) => ridesApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rides'] }); toast.success('Ride status updated'); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = rides.filter((r) =>
    `${r.id} ${r.driver_name ?? ''} ${r.bus_plate ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Ride>[] = [
    {
      key: 'ride',
      header: 'Ride ID',
      cell: (row) => <span className="font-mono text-xs text-gray-600">{String(row.id).slice(0, 8)}…</span>,
    },
    { key: 'departure', header: 'Departure', cell: (r) => formatDateTime(r.departure_time) },
    { key: 'arrival', header: 'Arrival', cell: (r) => r.arrival_time && !r.arrival_time.startsWith('0001') ? formatDateTime(r.arrival_time) : '—' },
    { key: 'fare', header: 'Fare', cell: (r) => formatCurrency(r.fare) },
    {
      key: 'seats',
      header: 'Seats',
      cell: (r) => (
        <span className="text-sm">
          {r.booked_seats}/{r.total_seats}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>,
    },
    { key: 'driver', header: 'Driver', cell: (r) => r.driver_name ?? '—' },
    { key: 'bus', header: 'Bus', cell: (r) => r.bus_plate ?? '—' },
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
              <button onClick={() => { navigate(`/rides/${row.id}`); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"><Eye className="w-3.5 h-3.5" /> View Details</button>
              {row.status === 'scheduled' && (
                <button onClick={() => { statusMutation.mutate({ id: row.id, status: 'boarding' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full">Start Boarding</button>
              )}
              {row.status === 'boarding' && (
                <button onClick={() => { statusMutation.mutate({ id: row.id, status: 'active' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full">Start Ride</button>
              )}
              {row.status === 'scheduled' && (
                <button onClick={() => { statusMutation.mutate({ id: row.id, status: 'cancelled' }); setActionMenu(null); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full">Cancel Ride</button>
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
      <Header title="Ride Management" subtitle="Schedule and manage bus rides" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Rides</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search rides…" className="w-48" />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Create Ride</Button>
            </div>
          </div>

          <div className="px-5 pt-3 border-b border-gray-100">
            <Tabs tabs={STATUS_TABS} active={statusTab} onChange={(k) => { setStatusTab(k); setPage(1); }} />
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/rides/${r.id}`)} emptyMessage="No rides found" />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={rides.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + rides.length} onChange={setPage} />
          </div>
        </div>
      </div>

      <RideForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={(p) => createMutation.mutate(p)} loading={createMutation.isPending} />
    </div>
  );
}

interface RideFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CreateRidePayload) => void;
  loading?: boolean;
}

function RideForm({ open, onClose, onSubmit, loading }: RideFormProps) {
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: routesApi.listLocations });
  const { data: destinations = [] } = useQuery({ queryKey: ['destinations'], queryFn: routesApi.listDestinations });
  const { data: stops = [] } = useQuery({ queryKey: ['stops'], queryFn: routesApi.listStops });
  const { data: buses = [] } = useQuery({ queryKey: ['buses'], queryFn: busesApi.list });
  const { data: allDrivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => driversApi.list() });
  const drivers = allDrivers.filter((d) => d.verification_status === 'approved' && d.status !== 'suspended');

  const [route, setRoute] = useState<CreateRoutePayload>(emptyRouteDraft());
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<CreateRidePayload, 'route'>>();
  const toRFC3339 = (dt: string) => dt ? new Date(dt).toISOString() : undefined;
  const submit = handleSubmit((data) => onSubmit({
    ...data,
    route,
    fare: Number(data.fare),
    departure_time: toRFC3339(data.departure_time)!,
    arrival_time: data.arrival_time ? toRFC3339(data.arrival_time) : undefined,
  }));

  const handleClose = () => { onClose(); reset(); setRoute(emptyRouteDraft()); };

  return (
    <Modal open={open} onClose={handleClose} title="Create Ride" size="xl"
      footer={<><Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Create Ride</Button></>}
    >
      <div className="grid grid-cols-1 gap-4">
        <RouteFields value={route} onChange={setRoute} locations={locations} destinations={destinations} stops={stops} />
        <Select label="Bus" required options={buses.map((b) => ({ value: b.id, label: `${b.plate_number} — ${b.model}` }))} placeholder="Select bus" {...register('bus_id', { required: 'Required', valueAsNumber: true })} error={errors.bus_id?.message} />
        <Select label="Driver" required options={drivers.map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} placeholder="Select driver" {...register('driver_id', { required: 'Required', valueAsNumber: true })} error={errors.driver_id?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Departure Time" type="datetime-local" required {...register('departure_time', { required: 'Required' })} error={errors.departure_time?.message} />
          <Input label="Arrival Time (optional)" type="datetime-local" {...register('arrival_time')} />
        </div>
        <Input label="Fare (₦)" type="number" required {...register('fare', { required: 'Required' })} error={errors.fare?.message} />
      </div>
    </Modal>
  );
}
