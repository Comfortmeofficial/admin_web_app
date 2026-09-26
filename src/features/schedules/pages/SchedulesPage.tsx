import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pause, Play, Pencil, Trash2, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { schedulesApi } from '../api/schedulesApi';
import { routesApi } from '@/features/routes/api/routesApi';
import { busesApi } from '@/features/buses/api/busesApi';
import { driversApi } from '@/features/drivers/api/driversApi';
import { adminsApi } from '@/features/admins/api/adminsApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage } from '@/lib/utils';
import type { RideSchedule, CreateRideSchedulePayload, RideScheduleStatus } from '@/types';

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
  const [deleteItem, setDeleteItem] = useState<RideSchedule | null>(null);

  const { data: schedules = [], isLoading } = useQuery({ queryKey: ['ride-schedules'], queryFn: schedulesApi.list , refetchInterval: 30_000});

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

  const deleteMutation = useMutation({
    mutationFn: schedulesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride-schedules'] });
      toast.success('Schedule deleted');
      setDeleteItem(null);
    },
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
    {
      key: 'driver',
      header: 'Driver / Marshal',
      cell: (r) => (
        <div className="text-xs">
          <p className="text-gray-900">{r.driver_name ?? '—'}</p>
          <p className="text-gray-500">{r.marshal_name ?? '—'}</p>
        </div>
      ),
    },
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
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteItem(row); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-32',
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

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        loading={deleteMutation.isPending}
        message={`Delete this schedule (${deleteItem?.route_name ?? 'route'}, ${deleteItem?.departure_time_of_day ?? ''})? Rides already generated from it are unaffected — this only stops future generation.`}
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
  const { data: routes = [] } = useQuery({ queryKey: ['routes', 'active'], queryFn: () => routesApi.list({ status: 'active' }) });
  const { data: buses = [] } = useQuery({ queryKey: ['buses'], queryFn: busesApi.list });
  const { data: allDrivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => driversApi.list() });
  const { data: allMarshals = [] } = useQuery({ queryKey: ['admins-marshals'], queryFn: adminsApi.listMarshals });

  const [days, setDays] = useState<number[]>([]);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateRideSchedulePayload>();

  // No driver field any more — a bus already has exactly one assigned
  // driver and (at most) one primary marshal (see BusDetailPage's Assign
  // Driver/Marshal flows), so every trip this schedule generates just reads
  // those fresh off the bus at generation time. This preview shows the
  // *current* assignment; it's informational, not what actually gets stored.
  const busId = watch('bus_id');
  const routeId = watch('route_id');
  const selectedBus = buses.find((b) => Number(b.id) === Number(busId));
  const selectedRoute = routes.find((r) => Number(r.id) === Number(routeId));
  const previewDriver = selectedBus?.driver_id
    ? allDrivers.find((d) => Number(d.id) === Number(selectedBus.driver_id))
    : undefined;
  const previewMarshalId = selectedBus?.marshal_ids?.[0];
  const previewMarshal = previewMarshalId
    ? allMarshals.find((m) => Number(m.id) === Number(previewMarshalId))
    : undefined;

  // Per-stop pricing lives on the schedule itself now, same as fare — set
  // fresh here rather than on the route (see RouteFields). Prefilled from
  // editing.stop_fares when editing; cleared when the admin actually
  // changes which route is selected (stop ids from the old route wouldn't
  // mean anything on the new one). lastAppliedRouteId distinguishes "the
  // route_id changed because we just reset() the form for editing" from "the
  // admin picked a different route in the dropdown" — only the latter clears.
  const [stopFares, setStopFares] = useState<Record<number, string>>({});
  const lastAppliedRouteId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!editing) {
      reset();
      setDays([]);
      setStopFares({});
      lastAppliedRouteId.current = undefined;
      return;
    }
    const editingRouteId = editing.route_id ? Number(editing.route_id) : undefined;
    reset({
      bus_id: Number(editing.bus_id),
      route_id: editingRouteId,
      fare: editing.fare,
      departure_time_of_day: editing.departure_time_of_day,
      duration_minutes: editing.duration_minutes ?? undefined,
      start_date: editing.start_date,
      end_date: editing.end_date ?? undefined,
    });
    setDays(editing.days_of_week);
    setStopFares(Object.fromEntries((editing.stop_fares ?? []).map((f) => [f.stop_id, String(f.fare)])));
    lastAppliedRouteId.current = editingRouteId;
  }, [editing, reset]);

  useEffect(() => {
    if (routeId === lastAppliedRouteId.current) return;
    setStopFares({});
    lastAppliedRouteId.current = routeId;
  }, [routeId]);

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const submit = handleSubmit((data) => {
    if (days.length === 0) {
      return;
    }
    onSubmit({
      ...data,
      fare: Number(data.fare),
      duration_minutes: Number(data.duration_minutes),
      days_of_week: days,
      end_date: data.end_date || null,
      stop_fares: Object.entries(stopFares)
        .filter(([, fare]) => fare !== '')
        .map(([stopId, fare]) => ({ stop_id: Number(stopId), fare: Number(fare) })),
    });
  });

  const handleClose = () => {
    onClose();
    reset();
    setDays([]);
    setStopFares({});
  };

  return (
    <Modal open={open} onClose={handleClose} title={editing ? 'Edit Schedule' : 'Create Schedule'} size="lg"
      footer={<><Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>{editing ? 'Save Changes' : 'Create Schedule'}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4">
        <Select
          label="Route"
          required
          options={routes.map((r) => ({ value: r.id, label: r.name }))}
          placeholder="Select route"
          hint={routes.length === 0 ? 'No active routes yet — create one from the Routes page first.' : undefined}
          {...register('route_id', { required: 'Required', valueAsNumber: true })}
          error={errors.route_id?.message}
        />
        <Select label="Bus" required options={buses.map((b) => ({ value: b.id, label: `${b.plate_number} — ${b.model}` }))} placeholder="Select bus" {...register('bus_id', { required: 'Required', valueAsNumber: true })} error={errors.bus_id?.message} />
        {selectedBus && (
          <div className="flex items-center gap-6 -mt-2 px-3 py-2 rounded-lg bg-gray-50 text-xs">
            <span>
              <span className="text-gray-500">Driver: </span>
              <span className={selectedBus.driver_id ? 'text-gray-900' : 'text-red-500'}>
                {selectedBus.driver_id ? (previewDriver ? `${previewDriver.first_name} ${previewDriver.last_name}` : `#${selectedBus.driver_id}`) : 'None assigned — trips can\'t generate until one is'}
              </span>
            </span>
            <span>
              <span className="text-gray-500">Marshal: </span>
              <span className="text-gray-900">{previewMarshal ? `${previewMarshal.first_name} ${previewMarshal.last_name}` : 'None assigned'}</span>
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Departure Time" type="time" required {...register('departure_time_of_day', { required: 'Required' })} error={errors.departure_time_of_day?.message} />
          <Input label="Duration (minutes)" type="number" required {...register('duration_minutes', { required: 'Required', valueAsNumber: true })} error={errors.duration_minutes?.message} hint="Needed to detect overlapping trips on the same bus." />
        </div>
        <Input label="Fare (₦)" type="number" required {...register('fare', { required: 'Required' })} error={errors.fare?.message} />

        {selectedRoute && (selectedRoute.stops?.length ?? 0) > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Stop Fares <span className="text-gray-400 font-normal">(optional)</span></p>
            <p className="text-xs text-gray-400 mb-2">
              Charge a different price for boarding at one of this route's stops — leave a stop blank
              to use the base fare above. Applies to every trip this schedule generates.
            </p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {selectedRoute.stops!.map((s) => {
                const stopId = Number(s.stop_id);
                return (
                  <div key={stopId} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{s.stop?.name ?? `Stop #${stopId}`}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      placeholder="Fare (₦)"
                      value={stopFares[stopId] ?? ''}
                      onChange={(e) => setStopFares((prev) => ({ ...prev, [stopId]: e.target.value }))}
                      className="w-28 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
