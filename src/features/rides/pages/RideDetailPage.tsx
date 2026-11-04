import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bus, User, Calendar, MapPin, Shield } from 'lucide-react';
import { ridesApi } from '../api/ridesApi';
import { driversApi } from '@/features/drivers/api/driversApi';
import { adminsApi } from '@/features/admins/api/adminsApi';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Tabs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDateTime, formatCurrency, getErrorMessage, slugToLabel, stopName } from '@/lib/utils';
import type { Admin, Booking, Driver, RideStatus } from '@/types';

const STATUS_ACTIONS: { from: RideStatus; to: RideStatus; label: string; variant: 'primary' | 'danger' | 'outline' }[] = [
  { from: 'scheduled', to: 'boarding', label: 'Start Boarding', variant: 'primary' },
  { from: 'boarding', to: 'active', label: 'Start Ride', variant: 'primary' },
  { from: 'active', to: 'completed', label: 'Complete Ride', variant: 'primary' },
  { from: 'scheduled', to: 'cancelled', label: 'Cancel', variant: 'danger' },
];

const TERMINAL_STATUSES: RideStatus[] = ['cancelled', 'completed'];

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmAction, setConfirmAction] = useState<{ to: RideStatus; label: string } | null>(null);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAssignMarshal, setShowAssignMarshal] = useState(false);
  const [selectedMarshal, setSelectedMarshal] = useState<Admin | null>(null);

  const { data: ride, isLoading } = useQuery({
    queryKey: ['ride', id],
    queryFn: () => ridesApi.get(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', { ride_id: id }],
    queryFn: () => bookingsApi.list({ ride_id: id } as Parameters<typeof bookingsApi.list>[0]),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
    enabled: showAssignDriver,
  });
  const eligibleDrivers = allDrivers.filter((d) => d.status !== 'suspended');

  const { data: marshals = [] } = useQuery({
    queryKey: ['admins', 'marshals'],
    queryFn: () => adminsApi.listMarshals(),
    enabled: showAssignMarshal,
  });

  const statusMutation = useMutation({
    mutationFn: (status: RideStatus) => ridesApi.updateStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride', id] });
      qc.invalidateQueries({ queryKey: ['rides'] });
      toast.success('Ride status updated');
      setConfirmAction(null);
    },
    onError: (e) => { toast.error('Failed', getErrorMessage(e)); setConfirmAction(null); },
  });

  const assignDriverMutation = useMutation({
    mutationFn: async (driver: Driver) => {
      await ridesApi.assignDriver(id!, driver.id);
      if (driver.assigned_bus_id) {
        await ridesApi.assignBus(id!, driver.assigned_bus_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride', id] });
      qc.invalidateQueries({ queryKey: ['rides'] });
      toast.success('Driver assigned');
      setShowAssignDriver(false);
      setSelectedDriver(null);
    },
    onError: (e) => toast.error('Failed to assign driver', getErrorMessage(e)),
  });

  const assignMarshalMutation = useMutation({
    mutationFn: (marshalAdminId: number | null) => ridesApi.assignMarshal(id!, marshalAdminId),
    onSuccess: (_data, marshalAdminId) => {
      qc.invalidateQueries({ queryKey: ['ride', id] });
      qc.invalidateQueries({ queryKey: ['rides'] });
      toast.success(marshalAdminId ? 'Marshal assigned' : 'Marshal removed');
      setShowAssignMarshal(false);
      setSelectedMarshal(null);
    },
    onError: (e) => toast.error('Failed to assign marshal', getErrorMessage(e)),
  });

  if (isLoading) return <PageSpinner />;
  if (!ride) return null;

  const actions = STATUS_ACTIONS.filter((a) => a.from === ride.status);
  const canEdit = !TERMINAL_STATUSES.includes(ride.status);

  // Groups everyone still expected to get off somewhere (skips cancelled
  // and no-show bookings — they're never actually on the bus) by their
  // drop-off point, in route order, so ops can see at a glance which
  // stops this ride actually needs to make instead of every one on the
  // route. A stop already ticked off by the marshal in Pickup Points is
  // the same physical point the bus has already passed, flagged the same
  // way here — mirrors the marshal trip view's own Drop-off Stops card.
  const onRouteStops = [...(ride.route?.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order);
  const dropoffGroups = (() => {
    const toDrop = bookings.filter((b) => b.status !== 'cancelled' && !b.no_show_at);
    const groups: { name: string; passed: boolean; bookings: Booking[] }[] = [];
    for (const s of onRouteStops) {
      const here = toDrop.filter((b) => String(b.dropoff_stop_id) === String(s.stop.id));
      if (here.length > 0) groups.push({ name: s.stop.name, passed: !!s.passed, bookings: here });
    }
    const atFinal = toDrop.filter((b) => b.dropoff_stop_id == null);
    if (atFinal.length > 0) {
      groups.push({
        name: `Final Destination (${ride.route?.destination?.name ?? '—'})`,
        passed: false,
        bookings: atFinal,
      });
    }
    return groups;
  })();

  const bookingColumns: Column<Booking>[] = [
    { key: 'ref', header: 'Reference', cell: (b) => <span className="font-mono text-xs">{b.reference}</span> },
    {
      key: 'passenger', header: 'Passenger',
      cell: (b) => b.user ? (
        <div className="text-xs">
          <div className="text-gray-700 font-medium">{b.user.first_name} {b.user.last_name}</div>
          <div className="text-gray-400">{b.user.email}</div>
          {b.user.phone && <div className="text-gray-400">{b.user.phone}</div>}
        </div>
      ) : <span className="text-gray-400 text-xs">Unknown</span>,
    },
    { key: 'seat', header: 'Seat', cell: (b) => b.seat_number },
    { key: 'amount', header: 'Amount', cell: (b) => formatCurrency(b.final_amount) },
    { key: 'method', header: 'Method', cell: (b) => <Badge variant="gray">{slugToLabel(b.payment_method)}</Badge> },
    {
      key: 'stops', header: 'Pickup / Drop-off',
      cell: (b) => {
        const pickup = stopName(ride.route?.stops, b.pickup_stop_id) ?? ride.route?.location?.name ?? 'Default';
        const dropoff = stopName(ride.route?.stops, b.dropoff_stop_id) ?? ride.route?.destination?.name ?? 'Final';
        return (
          <div className="text-xs">
            <div className="text-gray-700">{pickup}</div>
            <div className="text-gray-400">→ {dropoff}</div>
          </div>
        );
      },
    },
    { key: 'status', header: 'Status', cell: (b) => <Badge variant={statusBadge(b.status)} dot>{slugToLabel(b.status)}</Badge> },
    { key: 'onboard', header: 'On Board', cell: (b) => <Badge variant={b.is_on_board ? 'success' : 'gray'}>{b.is_on_board ? 'Yes' : 'No'}</Badge> },
    { key: 'booked', header: 'Booked At', cell: (b) => formatDateTime(b.created_at) },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Ride Details" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          Back to Rides
        </Button>

        {/* Status hero */}
        <Card className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold font-mono text-gray-900">{String(ride.id).slice(0, 8)}…</h2>
              <Badge variant={statusBadge(ride.status)} dot>{slugToLabel(ride.status)}</Badge>
            </div>
            <p className="text-sm text-gray-500">Departure: {formatDateTime(ride.departure_time)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((a) => (
              <Button
                key={a.to}
                variant={a.variant}
                size="sm"
                onClick={() => {
                  if (a.variant === 'danger') {
                    setConfirmAction({ to: a.to, label: a.label });
                  } else {
                    statusMutation.mutate(a.to);
                  }
                }}
                loading={statusMutation.isPending}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </Card>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Ride Information</h3>
            </div>
            <dl className="space-y-3">
              {[
                ['Departure', formatDateTime(ride.departure_time)],
                ['Arrival', ride.arrival_time && !ride.arrival_time.startsWith('0001') ? formatDateTime(ride.arrival_time) : '—'],
                ['Fare', formatCurrency(ride.fare)],
                ['Seats Booked', `${ride.booked_seats} / ${ride.total_seats}`],
                ['Route', ride.route ? `${ride.route.location?.name ?? '—'} → ${ride.route.destination?.name ?? '—'}` : ride.route_id],
                ['Created', formatDateTime(ride.created_at)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-4 items-center">
                  <dt className="text-sm text-gray-500">{label as string}</dt>
                  <dd className="text-sm font-medium text-gray-900 text-right">{value as string}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="space-y-4">
            {/* Driver card */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Driver</h3>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => setShowAssignDriver(true)}>
                    {ride.driver_name ? 'Reassign' : 'Assign Driver'}
                  </Button>
                )}
              </div>
              {ride.driver_name ? (
                <dl className="space-y-3">
                  {[
                    ['Name', ride.driver_name],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between gap-4">
                      <dt className="text-sm text-gray-500">{label as string}</dt>
                      <dd className="text-sm font-medium text-gray-900">{value as string}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">No driver assigned yet.</p>
              )}
            </Card>

            {/* Bus card */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Bus className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Bus</h3>
              </div>
              {ride.bus_plate ? (
                <dl className="space-y-3">
                  {[
                    ['Plate', ride.bus_plate],
                    ['Model', ride.bus_model ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between gap-4">
                      <dt className="text-sm text-gray-500">{label as string}</dt>
                      <dd className="text-sm font-medium text-gray-900">{value as string}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">
                  {canEdit ? 'Assign a driver to auto-assign their bus.' : 'No bus assigned.'}
                </p>
              )}
            </Card>

            {/* Marshal card */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Bus Marshal</h3>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    {ride.marshal_name && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => assignMarshalMutation.mutate(null)}
                        loading={assignMarshalMutation.isPending}
                      >
                        Remove
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setShowAssignMarshal(true)}>
                      {ride.marshal_name ? 'Reassign' : 'Assign Marshal'}
                    </Button>
                  </div>
                )}
              </div>
              {ride.marshal_name ? (
                <p className="text-sm font-medium text-gray-900">{ride.marshal_name}</p>
              ) : (
                <p className="text-sm text-gray-500">No marshal assigned yet.</p>
              )}
            </Card>
          </div>
        </div>

        {/* Drop-off Stops */}
        {dropoffGroups.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Drop-off Stops</h3>
            </div>
            <p className="text-xs text-gray-500">
              Only needs to stop at a point below if someone's actually getting off there.
            </p>
            <div className="space-y-2">
              {dropoffGroups.map((group) => (
                <div
                  key={group.name}
                  className={`rounded-lg border px-3 py-2 ${group.passed ? 'border-gray-200 bg-gray-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${group.passed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {group.name}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {group.bookings.length} passenger{group.bookings.length > 1 ? 's' : ''}
                      {group.passed ? ' · already passed' : ''}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${group.passed ? 'text-gray-400' : 'text-gray-600'}`}>
                    {group.bookings
                      .map((b) => (b.user ? `${b.user.first_name} ${b.user.last_name}` : 'Unknown passenger'))
                      .join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <MapPin className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Bookings</h3>
            <span className="text-sm text-gray-400 ml-1">({bookings.length})</span>
          </div>
          <Table
            columns={bookingColumns}
            data={bookings}
            loading={bookingsLoading}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`/bookings/${b.id}`)}
            emptyMessage="No bookings for this ride"
          />
        </div>
      </div>

      {/* Assign Driver modal */}
      <Modal
        open={showAssignDriver}
        onClose={() => { setShowAssignDriver(false); setSelectedDriver(null); }}
        title="Assign Driver"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowAssignDriver(false); setSelectedDriver(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedDriver && assignDriverMutation.mutate(selectedDriver)}
              loading={assignDriverMutation.isPending}
              disabled={!selectedDriver}
            >
              Assign
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Select Driver"
            value={selectedDriver?.id ?? ''}
            onChange={(e) => {
              const driver = eligibleDrivers.find((d) => d.id === e.target.value) ?? null;
              setSelectedDriver(driver);
            }}
            options={eligibleDrivers.map((d) => ({
              value: d.id,
              label: `${d.first_name} ${d.last_name} — ${d.license_number}`,
            }))}
            placeholder="Choose a driver"
          />
          {selectedDriver && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800 space-y-1">
              {selectedDriver.assigned_bus_id ? (
                <p><span className="font-medium">Bus will also be assigned</span> — ID {selectedDriver.assigned_bus_id}</p>
              ) : (
                <p className="text-amber-700">This driver has no bus assigned. Only the driver will be linked.</p>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Assign Marshal modal */}
      <Modal
        open={showAssignMarshal}
        onClose={() => { setShowAssignMarshal(false); setSelectedMarshal(null); }}
        title="Assign Bus Marshal"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowAssignMarshal(false); setSelectedMarshal(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedMarshal && assignMarshalMutation.mutate(Number(selectedMarshal.id))}
              loading={assignMarshalMutation.isPending}
              disabled={!selectedMarshal}
            >
              Assign
            </Button>
          </>
        }
      >
        <Select
          label="Select Marshal"
          value={selectedMarshal?.id ?? ''}
          onChange={(e) => {
            const marshal = marshals.find((m) => String(m.id) === e.target.value) ?? null;
            setSelectedMarshal(marshal);
          }}
          options={marshals
            .filter((m) => m.is_active)
            .map((m) => ({
              value: m.id,
              label: `${m.first_name} ${m.last_name} — ${m.email}`,
            }))}
          placeholder={marshals.length ? 'Choose a marshal' : 'No active bus marshals yet'}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && statusMutation.mutate(confirmAction.to)}
        loading={statusMutation.isPending}
        message={`Are you sure you want to ${confirmAction?.label.toLowerCase()} this ride?`}
        confirmLabel={confirmAction?.label}
      />
    </div>
  );
}
