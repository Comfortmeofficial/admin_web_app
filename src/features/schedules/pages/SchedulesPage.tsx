import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pause, Play, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { schedulesApi } from '../api/schedulesApi';
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
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { RideSchedule, CreateRideSchedulePayload, CreateRoutePayload, RideScheduleStatus } from '@/types';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysOfWeekLabel(days: number[]): string {
  if (days.length === 7) return 'Every day';
  return [...days].sort().map((d) => DAY_LABELS[d]).join(' ');
}

export function SchedulesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RideSchedule | null>(null);

  const { data: schedules = [], isLoading } = useQuery({ queryKey: ['ride-schedules'], queryFn: schedulesApi.list });

  // Opportunistic generation trigger — makes recurring rides work even if
  // no cron job is configured on the deploy target, since admins visiting
  // this page is itself a reasonable proxy for "check in periodically".
  useEffect(() => {
    schedulesApi.generateNow().catch(() => {});
  }, []);

  const createMutation = useMutation({
    mutationFn: schedulesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ride-schedules'] }); toast.success('Schedule created'); setShowForm(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateRideSchedulePayload }) => schedulesApi.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ride-schedules'] }); toast.success('Schedule updated'); setEditing(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RideScheduleStatus }) => schedulesApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ride-schedules'] }); toast.success('Schedule updated'); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const columns: Column<RideSchedule>[] = [
    {
      key: 'route',
      header: 'Route',
      cell: (r) => (
        <div>
          <p className="font-medium text-gray-900">{r.route_name}</p>
          <p className="text-xs text-gray-500">{r.location?.name ?? r.location_id} → {r.destination?.name ?? r.destination_id}</p>
        </div>
      ),
    },
    { key: 'bus', header: 'Bus', cell: (r) => r.bus_plate ?? r.bus_id },
    { key: 'driver', header: 'Driver', cell: (r) => r.driver_name ?? r.driver_id },
    { key: 'time', header: 'Departs', cell: (r) => r.departure_time_of_day },
    { key: 'days', header: 'Days', cell: (r) => daysOfWeekLabel(r.days_of_week) },
    { key: 'window', header: 'Window', cell: (r) => `${formatDate(r.start_date)} → ${r.end_date ? formatDate(r.end_date) : 'ongoing'}` },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{r.status === 'active' ? 'Active' : 'Paused'}</Badge>,
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
              statusMutation.mutate({ id: row.id, status: row.status === 'active' ? 'paused' : 'active' });
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            title={row.status === 'active' ? 'Pause' : 'Resume'}
          >
            {row.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Ride Schedules" subtitle="Recurring rides — set up once, keeps generating future trips" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Schedules</h2>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>Create Schedule</Button>
          </div>

          <Table columns={columns} data={schedules} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No recurring schedules yet" />
        </div>
      </div>

      <ScheduleForm
        open={showForm || !!editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSubmit={(p) => editing ? updateMutation.mutate({ id: editing.id, payload: p }) : createMutation.mutate(p)}
        loading={createMutation.isPending || updateMutation.isPending}
        editing={editing}
      />
    </div>
  );
}

interface ScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CreateRideSchedulePayload) => void;
  loading?: boolean;
  editing: RideSchedule | null;
}

function ScheduleForm({ open, onClose, onSubmit, loading, editing }: ScheduleFormProps) {
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: routesApi.listLocations });
  const { data: destinations = [] } = useQuery({ queryKey: ['destinations'], queryFn: routesApi.listDestinations });
  const { data: stops = [] } = useQuery({ queryKey: ['stops'], queryFn: routesApi.listStops });
  const { data: buses = [] } = useQuery({ queryKey: ['buses'], queryFn: busesApi.list });
  const { data: allDrivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => driversApi.list() });
  const drivers = allDrivers.filter((d) => d.verification_status === 'approved' && d.status !== 'suspended');

  const [route, setRoute] = useState<CreateRoutePayload>(emptyRouteDraft());
  const [days, setDays] = useState<number[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    bus_id: number;
    driver_id: number;
    fare: number;
    departure_time_of_day: string;
    duration_minutes?: number;
    start_date: string;
    end_date?: string;
  }>();

  useEffect(() => {
    if (!editing) {
      reset();
      setRoute(emptyRouteDraft());
      setDays([]);
      return;
    }
    reset({
      bus_id: Number(editing.bus_id),
      driver_id: Number(editing.driver_id),
      fare: editing.fare,
      departure_time_of_day: editing.departure_time_of_day,
      duration_minutes: editing.duration_minutes ?? undefined,
      start_date: editing.start_date,
      end_date: editing.end_date ?? undefined,
    });
    setRoute({
      name: editing.route_name,
      location_id: Number(editing.location_id),
      destination_id: Number(editing.destination_id),
      distance_km: editing.distance_km,
      stops: editing.stops.map((s) => ({ stop_id: s.stop_id, fare: s.fare ?? undefined })),
    });
    setDays(editing.days_of_week);
  }, [editing, reset]);

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const submit = handleSubmit((data) => {
    if (!route.name || !route.location_id || !route.destination_id) {
      return;
    }
    if (days.length === 0) {
      return;
    }
    onSubmit({
      ...data,
      route,
      fare: Number(data.fare),
      duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : undefined,
      days_of_week: days,
      end_date: data.end_date || null,
    });
  });

  const handleClose = () => {
    onClose();
    reset();
    setRoute(emptyRouteDraft());
    setDays([]);
  };

  return (
    <Modal open={open} onClose={handleClose} title={editing ? 'Edit Schedule' : 'Create Schedule'} size="xl"
      footer={<><Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>{editing ? 'Save Changes' : 'Create Schedule'}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4">
        <RouteFields value={route} onChange={setRoute} locations={locations} destinations={destinations} stops={stops} />
        <Select label="Bus" required options={buses.map((b) => ({ value: b.id, label: `${b.plate_number} — ${b.model}` }))} placeholder="Select bus" {...register('bus_id', { required: 'Required', valueAsNumber: true })} error={errors.bus_id?.message} />
        <Select label="Driver" required options={drivers.map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} placeholder="Select driver" {...register('driver_id', { required: 'Required', valueAsNumber: true })} error={errors.driver_id?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Departure Time" type="time" required {...register('departure_time_of_day', { required: 'Required' })} error={errors.departure_time_of_day?.message} />
          <Input label="Duration (minutes, optional)" type="number" {...register('duration_minutes')} />
        </div>
        <Input label="Fare (₦)" type="number" required {...register('fare', { required: 'Required' })} error={errors.fare?.message} />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Repeats on</p>
          <div className="flex gap-2">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${
                  days.includes(i)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {days.length === 0 && <p className="text-xs text-red-500 mt-1">Select at least one day</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" required {...register('start_date', { required: 'Required' })} error={errors.start_date?.message} />
          <Input label="End Date (optional)" type="date" {...register('end_date')} />
        </div>
      </div>
    </Modal>
  );
}
