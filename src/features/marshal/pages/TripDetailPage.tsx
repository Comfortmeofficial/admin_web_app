import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  QrCode,
  ShieldAlert,
  Square,
  UserX,
  XCircle,
} from 'lucide-react';
import { ridesApi } from '@/features/rides/api/ridesApi';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDateTime, formatTime, getErrorMessage, slugToLabel, stopName } from '@/lib/utils';
import type { Passenger, TripIssueCategory } from '@/types';
import { isOpen } from '../marshalInbox';

// How early before departure a marshal can start boarding/the trip — status
// alone ('scheduled') doesn't distinguish a trip departing in 10 minutes
// from one three months out, so without this every future trip's Start/End
// buttons were live the moment it was assigned.
const EARLY_ACTION_WINDOW_MS = 30 * 60 * 1000;

// The rider's app shows a QR encoding "CMBOOKING:{booking_id}:{reference}"
// (see BookingQRModal in customer_mobile_app) — independent of the ride's
// shared boarding_code the driver displays. Verified server-side in
// checkBoardingCode, which accepts either code.
function parseBookingQr(data: string): { bookingId: number; reference: string } | null {
  const parts = data.split(':');
  if (parts.length < 3 || parts[0] !== 'CMBOOKING') return null;
  const bookingId = Number(parts[1]);
  if (!Number.isFinite(bookingId)) return null;
  return { bookingId, reference: parts.slice(2).join(':') };
}

// wa.me needs the full international number as digits only, no leading
// "+". Nigerian numbers are the overwhelming majority here and are often
// stored in local format (a leading 0) rather than +234 — normalized the
// same way a Nigerian number is commonly converted for a wa.me link.
function whatsappHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const international = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

type BoardMode = 'scan';
type PassengerFilter = 'pending' | 'boarded' | 'all';

export function TripDetailPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [boardMode, setBoardMode] = useState<BoardMode | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [justBoarded, setJustBoarded] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cancelTarget, setCancelTarget] = useState<Passenger | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Passenger | null>(null);
  const [endTripOpen, setEndTripOpen] = useState(false);
  const [startTripOpen, setStartTripOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [filter, setFilter] = useState<PassengerFilter>('pending');

  const { data: rides, isLoading: ridesLoading } = useQuery({
    queryKey: ['rides', 'mine'],
    queryFn: () => ridesApi.mine(),
    refetchInterval: 30_000,
  });
  // Ride.id is typed as string here, but the API actually sends it as a
  // number — comparing directly to the string route param always failed,
  // so every trip page showed "Trip not found" no matter what was clicked.
  const activeRide = rides?.find((r) => String(r.id) === rideId) ?? null;

  const { data: passengers = [], isLoading: passengersLoading } = useQuery({
    queryKey: ['ride-passengers', rideId],
    queryFn: () => ridesApi.getPassengers(rideId!),
    enabled: !!rideId,
    refetchInterval: 15_000,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['ride-issues', rideId],
    queryFn: () => ridesApi.getIssues(rideId!),
    enabled: !!rideId,
  });

  // The scanner callback outlives a single render; it reads the latest list
  // through this instead of a stale closure.
  const passengersRef = useRef<Passenger[]>([]);
  passengersRef.current = passengers;

  const closeBoardModal = () => {
    setBoardMode(null);
    setScanFeedback(null);
    setJustBoarded(null);
  };

  const boardMutation = useMutation({
    mutationFn: ({ bookingId, code }: { bookingId: string; code: string; name: string }) =>
      bookingsApi.board(bookingId, code),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', rideId] });
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      toast.success(`${vars.name} boarded`);
      // Keep the camera going so the next passenger can be scanned straight away.
      setJustBoarded(vars.name);
      setScanFeedback(null);
      setScanKey((k) => k + 1);
      setTimeout(() => setJustBoarded(null), 3000);
    },
    onError: (e) => {
      toast.error('Failed', getErrorMessage(e));
      setScanFeedback(null);
      setScanKey((k) => k + 1); // scanner was stopped before the request — restart it
    },
  });

  // One click, no QR scan or boarding code — the marshal's already
  // identifying the right person by picking them off the manifest.
  const boardDirectMutation = useMutation({
    mutationFn: ({ bookingId }: { bookingId: string; name: string }) => bookingsApi.boardDirect(bookingId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', rideId] });
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      toast.success(`${vars.name} boarded`);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  // Runs the camera scanner whenever the board modal is open; torn down on
  // close so the camera light doesn't stay on.
  useEffect(() => {
    if (!boardMode) return;
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => {
        const parsed = parseBookingQr(result.data);
        if (!parsed) {
          setScanFeedback('Not a valid boarding QR code.');
          return;
        }
        const target = passengersRef.current.find((p) => p.booking_id === parsed.bookingId);
        if (!target) {
          setScanFeedback("That ticket isn't for this trip.");
          return;
        }
        const name = `${target.first_name} ${target.last_name}`.trim();
        if (target.status !== 'confirmed') {
          setScanFeedback(`${name}'s booking is ${slugToLabel(target.status).toLowerCase()}.`);
          return;
        }
        if (target.is_on_board) {
          setScanFeedback(`${name} is already on board.`);
          return;
        }
        setScanFeedback(null);
        scanner.stop();
        boardMutation.mutate({ bookingId: String(target.booking_id), code: parsed.reference, name });
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true },
    );
    scanner.start().catch(() => setScanFeedback('Camera access is needed to scan the code.'));

    return () => {
      scanner.stop();
      scanner.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardMode, scanKey]);

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', rideId] });
      toast.success('Booking cancelled');
      setCancelTarget(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const noShowMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.markNoShow(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', rideId] });
      toast.success('Marked as no-show');
      setNoShowTarget(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const startTripMutation = useMutation({
    mutationFn: (id: string) => ridesApi.startTrip(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      toast.success('Ride started');
      setStartTripOpen(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const endTripMutation = useMutation({
    mutationFn: (id: string) => ridesApi.endTrip(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      qc.invalidateQueries({ queryKey: ['ride-passengers', rideId] });
      toast.success('Trip ended');
      setEndTripOpen(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const passedStopMutation = useMutation({
    mutationFn: ({ stopId, passed }: { stopId: number | null; passed: boolean }) =>
      ridesApi.setPassedStop(rideId!, stopId, passed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rides', 'mine'] }),
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  if (ridesLoading) return <PageSpinner />;

  if (!activeRide) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Trip" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">Trip not found</p>
            <p className="text-sm text-gray-500 mt-1">
              It isn't one of your assigned trips, or it's since been reassigned.
            </p>
            <Link to="/my-trip" className="inline-block mt-4 text-sm font-medium text-primary-600">
              ← Back to My Schedule
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activePassengers = passengers.filter((p) => p.status !== 'cancelled');
  const boardedCount = activePassengers.filter((p) => p.is_on_board).length;
  // Groups everyone still expected to get off somewhere (skips no-shows —
  // they're never actually on the bus) by their drop-off point, in route
  // order, so the marshal only stops where someone's actually getting off
  // instead of every single stop on the route. A stop already ticked off
  // in Pickup Points is the same physical point the bus has already
  // passed, so its drop-off group is flagged the same way here.
  const onRouteStops = [...(activeRide.route?.stops ?? [])].sort((a, b) => a.stop_order - b.stop_order);
  const dropoffGroups = (() => {
    const toDrop = activePassengers.filter((p) => !p.no_show_at);
    const groups: { name: string; passed: boolean; passengers: Passenger[] }[] = [];
    for (const s of onRouteStops) {
      const here = toDrop.filter((p) => String(p.dropoff_stop_id) === String(s.stop.id));
      if (here.length > 0) groups.push({ name: s.stop.name, passed: !!s.passed, passengers: here });
    }
    const atFinal = toDrop.filter((p) => p.dropoff_stop_id == null);
    if (atFinal.length > 0) {
      groups.push({
        name: `Final Destination (${activeRide.route?.destination?.name ?? '—'})`,
        passed: false,
        passengers: atFinal,
      });
    }
    return groups;
  })();
  const departureMs = new Date(activeRide.departure_time).getTime();
  const actionsUnlockAt = departureMs - EARLY_ACTION_WINDOW_MS;
  // Once a trip is actually active/boarding, ending it is never time-gated —
  // that status only exists because a real boarding or start already
  // happened, which the window above already guarded.
  const actionsUnlocked = Date.now() >= actionsUnlockAt || activeRide.status === 'active' || activeRide.status === 'boarding';
  const canBoard = isOpen(activeRide) && actionsUnlocked;
  const canStart = actionsUnlocked && (activeRide.status === 'scheduled' || activeRide.status === 'boarding');
  const canEnd = activeRide.status === 'active' || activeRide.status === 'boarding';
  const visiblePassengers = passengers.filter((p) =>
    filter === 'all' ? true : filter === 'boarded' ? p.is_on_board : !p.is_on_board && p.status !== 'cancelled',
  );
  const pendingCount = activePassengers.length - boardedCount;
  const routeName =
    activeRide.route?.location?.name && activeRide.route.destination?.name
      ? `${activeRide.route.location.name} → ${activeRide.route.destination.name}`
      : (activeRide.route?.name ?? 'Trip');

  return (
    <div className="flex flex-col h-full">
      <Header title={routeName} subtitle={formatDateTime(activeRide.departure_time)} />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <Link to="/my-trip" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> My Schedule
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900">{routeName}</p>
              <p className="text-sm text-gray-600 mt-0.5">{formatDateTime(activeRide.departure_time)}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeRide.bus_plate ?? 'Bus TBD'} · {activeRide.driver_name ?? 'Driver TBD'}
              </p>
            </div>
            <Badge variant={statusBadge(activeRide.status)} dot>{slugToLabel(activeRide.status)}</Badge>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600">Boarded</span>
              <span className="font-semibold text-gray-900">
                {boardedCount} / {activePassengers.length}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${activePassengers.length ? (boardedCount / activePassengers.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {isOpen(activeRide) ? (
            <div className="space-y-2">
              {canBoard && (
                <Button
                  size="lg"
                  icon={<QrCode className="w-4 h-4" />}
                  className="w-full justify-center"
                  onClick={() => setBoardMode('scan')}
                >
                  Scan ticket to board
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="lg"
                  variant={canStart ? 'primary' : 'outline'}
                  icon={<Play className="w-4 h-4" />}
                  className="justify-center"
                  disabled={!canStart}
                  onClick={() => setStartTripOpen(true)}
                >
                  Start Ride
                </Button>
                <Button
                  size="lg"
                  variant={canEnd ? 'danger' : 'outline'}
                  icon={<Square className="w-4 h-4" />}
                  className="justify-center"
                  disabled={!canEnd}
                  onClick={() => setEndTripOpen(true)}
                >
                  End Ride
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {activeRide.status === 'active'
                  ? 'Ride in progress — end it when you reach the destination.'
                  : actionsUnlocked
                    ? 'Start the ride when the bus departs. Boarding the first passenger also starts it.'
                    : `Boarding and Start Ride open at ${formatTime(new Date(actionsUnlockAt).toISOString())}, 30 minutes before departure.`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">This ride has {activeRide.status === 'completed' ? 'ended' : 'been cancelled'}.</p>
          )}
        </div>

        {/* Pickup Points */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Pickup Points</h3>
          </div>
          <p className="text-xs text-gray-500">
            Tick off a point once the bus has passed it — it stops being offered to new bookings.
          </p>
          <div className="space-y-1.5">
            {[
              {
                stopId: null as number | null,
                name: `${activeRide.route?.location?.name ?? 'Default'} (Start)`,
                passed: !!activeRide.origin_passed,
              },
              ...(activeRide.route?.stops ?? [])
                .slice()
                .sort((a, b) => a.stop_order - b.stop_order)
                .map((s) => ({ stopId: Number(s.stop.id), name: s.stop.name, passed: !!s.passed })),
            ].map((point) => {
              const isPending =
                passedStopMutation.isPending && passedStopMutation.variables?.stopId === point.stopId;
              return (
                <button
                  key={point.stopId ?? 'origin'}
                  disabled={isPending || activeRide.status === 'completed' || activeRide.status === 'cancelled'}
                  onClick={() => passedStopMutation.mutate({ stopId: point.stopId, passed: !point.passed })}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-left disabled:opacity-60',
                    point.passed ? 'border-gray-200 bg-gray-50' : 'border-gray-200',
                  )}
                >
                  <span className={cn(point.passed ? 'text-gray-400 line-through' : 'text-gray-900')}>
                    {point.name}
                  </span>
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
                      point.passed ? 'bg-green-500 border-green-500' : 'border-gray-300',
                    )}
                  >
                    {point.passed && <Check className="w-3 h-3 text-white" />}
                  </span>
                </button>
              );
            })}
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
              Only stop at a point below if someone's actually getting off there.
            </p>
            <div className="space-y-2">
              {dropoffGroups.map((group) => (
                <div
                  key={group.name}
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    group.passed ? 'border-gray-200 bg-gray-50' : 'border-gray-200',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-sm font-medium', group.passed ? 'text-gray-400 line-through' : 'text-gray-900')}>
                      {group.name}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {group.passengers.length} passenger{group.passengers.length > 1 ? 's' : ''}
                      {group.passed ? ' · already passed' : ''}
                    </span>
                  </div>
                  <p className={cn('text-xs mt-0.5', group.passed ? 'text-gray-400' : 'text-gray-600')}>
                    {group.passengers.map((p) => `${p.first_name} ${p.last_name}`).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setIssuesOpen(true)}
            disabled={issues.length === 0}
            className="flex items-center gap-2 text-sm font-medium text-gray-900 disabled:text-gray-400"
          >
            <AlertTriangle className="w-4 h-4" />
            {issues.length === 0 ? 'No issues reported' : `${issues.length} issue${issues.length > 1 ? 's' : ''} reported`}
          </button>
          <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
            Report Issue
          </Button>
        </div>

        {/* Passengers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
            <h3 className="font-semibold text-gray-900">
              Passengers <span className="text-sm text-gray-400 font-normal">({passengers.length})</span>
            </h3>
            <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg text-sm">
              {(
                [
                  ['pending', `Not boarded (${pendingCount})`],
                  ['boarded', `Boarded (${boardedCount})`],
                  ['all', 'All'],
                ] as [PassengerFilter, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'rounded-md py-1.5 px-1 font-medium truncate',
                    filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {passengersLoading ? (
            <PageSpinner />
          ) : visiblePassengers.length === 0 ? (
            <p className="text-sm text-gray-500 px-4 py-8 text-center">
              {passengers.length === 0 ? 'No passengers booked yet.' : 'Nobody in this list.'}
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {visiblePassengers.map((p) => (
                <div key={p.booking_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Seat {p.seat_number}
                        {p.phone && <span className="text-gray-400"> · {p.phone}</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        Pickup: {stopName(activeRide.route?.stops, p.pickup_stop_id) ?? activeRide.route?.location?.name ?? 'Default'}
                        {' · '}
                        Drop-off: {stopName(activeRide.route?.stops, p.dropoff_stop_id) ?? activeRide.route?.destination?.name ?? 'Final'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={p.is_on_board ? 'success' : p.no_show_at ? 'danger' : 'gray'}>
                        {p.is_on_board ? 'On Board' : p.no_show_at ? 'No Show' : 'Not Boarded'}
                      </Badge>
                      {p.status !== 'confirmed' && (
                        <Badge variant={statusBadge(p.status)} dot>{slugToLabel(p.status)}</Badge>
                      )}
                    </div>
                  </div>

                  {canBoard && !p.is_on_board && p.status === 'confirmed' && (
                    <Button
                      className="w-full justify-center"
                      icon={<CheckCircle className="w-4 h-4" />}
                      loading={boardDirectMutation.isPending && boardDirectMutation.variables?.bookingId === String(p.booking_id)}
                      disabled={boardDirectMutation.isPending}
                      onClick={() =>
                        boardDirectMutation.mutate({ bookingId: String(p.booking_id), name: p.first_name })
                      }
                    >
                      Board
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 justify-center"
                      variant="outline"
                      aria-label={p.phone ? `Call ${p.first_name}` : 'No phone number'}
                      icon={<Phone className="w-4 h-4" />}
                      disabled={!p.phone}
                      onClick={() => p.phone && (window.location.href = `tel:${p.phone}`)}
                    >
                      <span className="hidden sm:inline">Call</span>
                    </Button>
                    <Button
                      className="flex-1 justify-center"
                      variant="outline"
                      aria-label={p.phone ? `Message ${p.first_name} on WhatsApp` : 'No phone number'}
                      icon={<MessageCircle className="w-4 h-4" />}
                      disabled={!p.phone}
                      onClick={() => {
                        const href = whatsappHref(p.phone);
                        if (href) window.open(href, '_blank', 'noopener');
                      }}
                    >
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                    {p.status !== 'cancelled' && (
                      <Button
                        variant="danger"
                        aria-label={`Cancel ${p.first_name}'s booking`}
                        icon={<XCircle className="w-4 h-4" />}
                        onClick={() => setCancelTarget(p)}
                      />
                    )}
                  </div>

                  {canBoard && !p.is_on_board && p.status === 'confirmed' && !p.no_show_at && (
                    <button
                      onClick={() => setNoShowTarget(p)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <UserX className="w-3.5 h-3.5" /> Mark as no-show
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Board modal — scanning only; boarding a specific passenger off the
          manifest is a direct one-click action now (see boardDirectMutation),
          no modal involved. */}
      <Modal
        open={!!boardMode}
        onClose={closeBoardModal}
        title="Scan ticket"
        size="sm"
        footer={
          <Button variant="outline" onClick={closeBoardModal} className="w-full justify-center">
            Done
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500 text-center">
            Scan each passenger’s QR code. Keep scanning — the camera stays on.
          </p>
          <video ref={videoRef} className="w-full aspect-square rounded-lg bg-gray-900 object-cover" />
          {justBoarded && <p className="text-sm text-green-600 font-medium text-center">✓ {justBoarded} boarded</p>}
          {scanFeedback && <p className="text-sm text-red-600 text-center">{scanFeedback}</p>}
          {boardMutation.isPending && <p className="text-sm text-gray-500">Confirming…</p>}
        </div>
      </Modal>

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(String(cancelTarget.booking_id))}
        loading={cancelMutation.isPending}
        message={`Cancel ${cancelTarget?.first_name ?? 'this passenger'}'s booking?`}
        confirmLabel="Cancel Booking"
      />

      {/* No-show confirm */}
      <ConfirmDialog
        open={!!noShowTarget}
        onClose={() => setNoShowTarget(null)}
        onConfirm={() => noShowTarget && noShowMutation.mutate(String(noShowTarget.booking_id))}
        loading={noShowMutation.isPending}
        title="Mark as no-show?"
        message={`${noShowTarget?.first_name ?? 'This passenger'} will be recorded as a no-show. Boarding them later still works and clears this.`}
        confirmLabel="Mark No-Show"
      />

      {/* Start ride confirm */}
      <ConfirmDialog
        open={startTripOpen}
        onClose={() => setStartTripOpen(false)}
        onConfirm={() => startTripMutation.mutate(activeRide.id)}
        loading={startTripMutation.isPending}
        title="Start this ride?"
        message={`Mark the ride as under way. ${boardedCount} of ${activePassengers.length} passengers have boarded so far; you can keep boarding after it starts.`}
        confirmLabel="Start Ride"
        confirmVariant="primary"
      />

      {/* End trip confirm — completing a ride is one-way */}
      <ConfirmDialog
        open={endTripOpen}
        onClose={() => setEndTripOpen(false)}
        onConfirm={() => endTripMutation.mutate(activeRide.id)}
        loading={endTripMutation.isPending}
        title="End this ride?"
        message={`Passengers who boarded (${boardedCount}) will be marked completed. This can't be undone.`}
        confirmLabel="End Ride"
      />

      {/* Issues */}
      <IssuesModal rideId={activeRide.id} issues={issues} open={issuesOpen} onClose={() => setIssuesOpen(false)} />
      <ReportIssueModal rideId={activeRide.id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}

const ISSUE_CATEGORY_LABELS: Record<TripIssueCategory, string> = {
  mechanical: 'Mechanical',
  passenger: 'Passenger',
  safety: 'Safety',
  other: 'Other',
};

function IssuesModal({
  issues,
  open,
  onClose,
}: {
  rideId: string;
  issues: { id: number; category: TripIssueCategory; description: string; reported_by_name: string; created_at: string }[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Trip Issues" size="md">
      <div className="space-y-3">
        {issues.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Nothing reported on this trip.</p>
        ) : (
          issues.map((i) => (
            <div key={i.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge variant="warning">{ISSUE_CATEGORY_LABELS[i.category]}</Badge>
                <span className="text-xs text-gray-400">{formatDateTime(i.created_at)}</span>
              </div>
              <p className="text-sm text-gray-800">{i.description}</p>
              <p className="text-xs text-gray-500 mt-1">Reported by {i.reported_by_name}</p>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

function ReportIssueModal({ rideId, open, onClose }: { rideId: string; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [category, setCategory] = useState<TripIssueCategory>('other');
  const [description, setDescription] = useState('');

  const reset = () => {
    setCategory('other');
    setDescription('');
  };

  const mutation = useMutation({
    mutationFn: () => ridesApi.reportIssue(rideId, { category, description: description.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride-issues', rideId] });
      toast.success('Issue reported');
      reset();
      onClose();
    },
    onError: (e) => toast.error('Could not report issue', getErrorMessage(e)),
  });

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Report an Issue"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!description.trim()}>
            Submit
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TripIssueCategory)}
          options={Object.entries(ISSUE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Textarea
          label="What happened?"
          placeholder="Describe the issue for ops to review…"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}
