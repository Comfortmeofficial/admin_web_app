import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import { CheckCircle, MessageCircle, Phone, Play, QrCode, Send, ShieldAlert, Square, XCircle } from 'lucide-react';
import { ridesApi } from '@/features/rides/api/ridesApi';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { cn, formatDateTime, getErrorMessage, slugToLabel } from '@/lib/utils';
import type { Passenger, Ride } from '@/types';
import { DAY_MS, isOpen, pickDefaultRide, startOfToday, useChatInbox } from '../marshalInbox';

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

// "Today · 06:30", "Tomorrow · 06:30", "Mon, 28 Sep · 06:30"
function rideChipLabel(iso: string) {
  const d = new Date(iso);
  const dayDiff = Math.round((new Date(d).setHours(0, 0, 0, 0) - startOfToday()) / DAY_MS);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day =
    dayDiff === 0
      ? 'Today'
      : dayDiff === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${time}`;
}

type BoardMode = { kind: 'scan' } | { kind: 'passenger'; passenger: Passenger };
type PassengerFilter = 'pending' | 'boarded' | 'all';

export function MyTripPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [boardMode, setBoardMode] = useState<BoardMode | null>(null);
  const [boardCode, setBoardCode] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [justBoarded, setJustBoarded] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cancelTarget, setCancelTarget] = useState<Passenger | null>(null);
  const [chatTarget, setChatTarget] = useState<Passenger | null>(null);
  const [endTripOpen, setEndTripOpen] = useState(false);
  const [filter, setFilter] = useState<PassengerFilter>('pending');
  const [startTripOpen, setStartTripOpen] = useState(false);

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['rides', 'mine'],
    queryFn: () => ridesApi.mine(),
    refetchInterval: 30_000,
  });

  // Looked up by id from the live list (not stored as an object) so the ride's
  // status stays fresh — boarding the first passenger flips it to "active",
  // which is what makes End Trip appear.
  const activeRide = rides.find((r) => r.id === selectedId) ?? pickDefaultRide(rides);

  const { data: passengers = [], isLoading: passengersLoading } = useQuery({
    queryKey: ['ride-passengers', activeRide?.id],
    queryFn: () => ridesApi.getPassengers(activeRide!.id),
    enabled: !!activeRide,
    refetchInterval: 15_000,
  });

  // The scanner callback outlives a single render; it reads the latest list
  // through this instead of a stale closure.
  const passengersRef = useRef<Passenger[]>([]);
  passengersRef.current = passengers;

  const { threads, loaded: threadsLoaded, unreadByUser, unreadTotal, markSeen } = useChatInbox(activeRide?.id ?? null);
  const activeRideId = activeRide?.id ?? null;
  const threadByUser = new Map(threads.map((t) => [t.user_id, t]));

  // Reading a thread (it's open) counts as seen, including messages that
  // arrive while it stays open.
  useEffect(() => {
    if (!chatTarget) return;
    const t = threadByUser.get(chatTarget.user_id);
    if (t) markSeen(chatTarget.user_id, t.customer_message_count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatTarget, threads]);

  // Alert when a new message lands while the marshal is on this page: a toast
  // and a short buzz on phones that support it. Waits for the first successful
  // load so messages that were already there don't announce themselves.
  const prevUnread = useRef<number | null>(null);
  useEffect(() => {
    prevUnread.current = null;
  }, [activeRideId]);
  useEffect(() => {
    if (!threadsLoaded) return;
    if (prevUnread.current !== null && unreadTotal > prevUnread.current) {
      const newest = threads
        .filter((t) => unreadByUser[t.user_id] && t.user_id !== chatTarget?.user_id)
        .sort((a, b) => b.last_at.localeCompare(a.last_at))[0];
      if (newest) {
        const who = passengersRef.current.find((p) => p.user_id === newest.user_id);
        toast.info(`New message${who ? ` from ${who.first_name}` : ''}`, newest.last_message);
        navigator.vibrate?.(200);
      }
    }
    prevUnread.current = unreadTotal;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadTotal, threadsLoaded]);

  // Opened from the header bell: jump to that trip and open the rider's chat
  // once their passenger row has loaded.
  const location = useLocation();
  const navigate = useNavigate();
  const pendingChat = useRef<{ rideId: string; userId: number } | null>(null);
  useEffect(() => {
    const st = location.state as { rideId?: string; openChatUserId?: number } | null;
    if (!st?.openChatUserId) return;
    pendingChat.current = { rideId: st.rideId ?? '', userId: st.openChatUserId };
    if (st.rideId) setSelectedId(st.rideId);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  useEffect(() => {
    const pending = pendingChat.current;
    if (!pending || activeRideId !== pending.rideId) return;
    const p = passengers.find((x) => x.user_id === pending.userId);
    if (p) {
      setChatTarget(p);
      pendingChat.current = null;
    }
    // location.state too: for a notification about the trip already on screen,
    // nothing else changes to re-run this after the request is recorded above.
  }, [passengers, activeRideId, location.state]);

  useEffect(() => {
    const original = document.title;
    if (unreadTotal > 0) document.title = `(${unreadTotal}) ${original.replace(/^\(\d+\)\s*/, '')}`;
    return () => {
      document.title = original;
    };
  }, [unreadTotal]);

  const closeBoardModal = () => {
    setBoardMode(null);
    setBoardCode('');
    setManualEntry(false);
    setScanFeedback(null);
    setJustBoarded(null);
  };

  const boardMutation = useMutation({
    mutationFn: ({ bookingId, code }: { bookingId: string; code: string; name: string }) =>
      bookingsApi.board(bookingId, code),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', activeRide?.id] });
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      toast.success(`${vars.name} boarded`);
      if (boardMode?.kind === 'scan') {
        // Keep the camera going so the next passenger can be scanned straight away.
        setJustBoarded(vars.name);
        setScanFeedback(null);
        setScanKey((k) => k + 1);
        setTimeout(() => setJustBoarded(null), 3000);
      } else {
        closeBoardModal();
      }
    },
    onError: (e) => {
      toast.error('Failed', getErrorMessage(e));
      setScanFeedback(null);
      setScanKey((k) => k + 1); // scanner was stopped before the request — restart it
    },
  });

  // Runs the camera scanner whenever the board modal is open in scan mode;
  // torn down on close/manual-toggle so the camera light doesn't stay on.
  useEffect(() => {
    if (!boardMode || manualEntry) return;
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
        const target =
          boardMode.kind === 'passenger'
            ? boardMode.passenger
            : passengersRef.current.find((p) => p.booking_id === parsed.bookingId);
        if (!target) {
          setScanFeedback("That ticket isn't for this trip.");
          return;
        }
        if (parsed.bookingId !== target.booking_id) {
          setScanFeedback('That QR belongs to a different passenger.');
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
  }, [boardMode, manualEntry, scanKey]);

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', activeRide?.id] });
      toast.success('Booking cancelled');
      setCancelTarget(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const startTripMutation = useMutation({
    mutationFn: (rideId: string) => ridesApi.startTrip(rideId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      toast.success('Ride started');
      setStartTripOpen(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const endTripMutation = useMutation({
    mutationFn: (rideId: string) => ridesApi.endTrip(rideId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      qc.invalidateQueries({ queryKey: ['ride-passengers', activeRide?.id] });
      toast.success('Trip ended');
      setEndTripOpen(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  if (isLoading) return <PageSpinner />;

  if (rides.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Header title="My Trip" subtitle="The trip you're conducting" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-medium">No trip assigned yet</p>
            <p className="text-sm text-gray-500 mt-1">
              An operations admin will assign you to a ride — check back before departure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Quick-pick chips: today onwards, still open — not all ~60 assigned dates.
  // Anything else (older trips, further out) is in the dropdown below.
  const todayStart = startOfToday();
  const chipRides = rides
    .filter((r) => isOpen(r) && new Date(r.departure_time).getTime() >= todayStart)
    .slice(0, 7);

  const activePassengers = passengers.filter((p) => p.status !== 'cancelled');
  const boardedCount = activePassengers.filter((p) => p.is_on_board).length;
  const canBoard = !!activeRide && isOpen(activeRide);
  const canStart = activeRide?.status === 'scheduled' || activeRide?.status === 'boarding';
  const canEnd = activeRide?.status === 'active' || activeRide?.status === 'boarding';
  const visiblePassengers = passengers
    .filter((p) =>
      filter === 'all' ? true : filter === 'boarded' ? p.is_on_board : !p.is_on_board && p.status !== 'cancelled',
    )
    .sort((a, b) => (unreadByUser[b.user_id] ?? 0) - (unreadByUser[a.user_id] ?? 0));
  const newestUnread = passengers
    .filter((p) => unreadByUser[p.user_id])
    .sort((a, b) => (threadByUser.get(b.user_id)?.last_at ?? '').localeCompare(threadByUser.get(a.user_id)?.last_at ?? ''))[0];
  const pendingCount = activePassengers.length - boardedCount;
  const routeName =
    activeRide?.route?.location?.name && activeRide.route.destination?.name
      ? `${activeRide.route.location.name} → ${activeRide.route.destination.name}`
      : (activeRide?.route?.name ?? 'Trip');

  return (
    <div className="flex flex-col h-full">
      <Header title="My Trip" subtitle="Passengers on the trip you're conducting" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Trip picker */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {chipRides.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'shrink-0 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium border',
                  activeRide?.id === r.id
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                )}
              >
                {rideChipLabel(r.departure_time)}
              </button>
            ))}
          </div>
          {rides.length > chipRides.length && (
            <select
              value={activeRide?.id ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-base sm:text-sm text-gray-700"
              aria-label="Choose another trip"
            >
              {rides.map((r) => (
                <option key={r.id} value={r.id}>
                  {formatDateTime(r.departure_time)} — {slugToLabel(r.status)}
                </option>
              ))}
            </select>
          )}
        </div>

        {activeRide && (
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

            {unreadTotal > 0 && newestUnread && (
              <button
                onClick={() => setChatTarget(newestUnread)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900"
              >
                <span className="flex items-center gap-2 font-medium">
                  <MessageCircle className="w-4 h-4" />
                  {unreadTotal} new message{unreadTotal > 1 ? 's' : ''}
                </span>
                <span className="text-blue-700 font-medium">Open</span>
              </button>
            )}

            {isOpen(activeRide) ? (
              <div className="space-y-2">
                {canBoard && (
                  <Button
                    size="lg"
                    icon={<QrCode className="w-4 h-4" />}
                    className="w-full justify-center"
                    onClick={() => setBoardMode({ kind: 'scan' })}
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
                    : 'Start the ride when the bus departs. Boarding the first passenger also starts it.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">This ride has {activeRide.status === 'completed' ? 'ended' : 'been cancelled'}.</p>
            )}
          </div>
        )}

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
                      <p className="text-sm text-gray-500">Seat {p.seat_number}</p>
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-sm text-primary-600 mt-0.5">
                          <Phone className="w-3.5 h-3.5" /> {p.phone}
                        </a>
                      )}
                      {threadByUser.get(p.user_id) && (
                        <p className={cn('text-xs truncate mt-1', unreadByUser[p.user_id] ? 'text-blue-700 font-medium' : 'text-gray-500')}>
                          {threadByUser.get(p.user_id)!.last_sender_type === 'marshal' ? 'You: ' : ''}
                          {threadByUser.get(p.user_id)!.last_message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={p.is_on_board ? 'success' : 'gray'}>{p.is_on_board ? 'On Board' : 'Not Boarded'}</Badge>
                      {p.status !== 'confirmed' && (
                        <Badge variant={statusBadge(p.status)} dot>{slugToLabel(p.status)}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canBoard && !p.is_on_board && p.status === 'confirmed' && (
                      <Button
                        className="flex-1 justify-center"
                        icon={<CheckCircle className="w-4 h-4" />}
                        onClick={() => setBoardMode({ kind: 'passenger', passenger: p })}
                      >
                        Board
                      </Button>
                    )}
                    <Button
                      className="flex-1 justify-center"
                      variant="outline"
                      icon={<MessageCircle className="w-4 h-4" />}
                      onClick={() => setChatTarget(p)}
                    >
                      Chat
                      {unreadByUser[p.user_id] > 0 && (
                        <span className="ml-0.5 rounded-full bg-red-600 text-white text-xs leading-none px-1.5 py-1">
                          {unreadByUser[p.user_id]}
                        </span>
                      )}
                    </Button>
                    {p.status !== 'cancelled' && (
                      <Button
                        variant="danger"
                        aria-label={`Cancel ${p.first_name}'s booking`}
                        icon={<XCircle className="w-4 h-4" />}
                        onClick={() => setCancelTarget(p)}
                      >
                        <span className="hidden sm:inline">Cancel</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Board modal */}
      <Modal
        open={!!boardMode}
        onClose={closeBoardModal}
        title={boardMode?.kind === 'passenger' ? `Board ${boardMode.passenger.first_name}` : 'Scan ticket'}
        size="sm"
        footer={
          manualEntry ? (
            <>
              <Button variant="outline" onClick={closeBoardModal}>Cancel</Button>
              <Button
                onClick={() =>
                  boardMode?.kind === 'passenger' &&
                  boardMutation.mutate({
                    bookingId: String(boardMode.passenger.booking_id),
                    code: boardCode,
                    name: boardMode.passenger.first_name,
                  })
                }
                loading={boardMutation.isPending}
                disabled={!boardCode.trim()}
              >
                Confirm
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={closeBoardModal} className="w-full justify-center">
              {boardMode?.kind === 'scan' ? 'Done' : 'Cancel'}
            </Button>
          )
        }
      >
        {manualEntry ? (
          <Input
            label="Boarding Code"
            placeholder="Ask the passenger for their booking reference"
            value={boardCode}
            onChange={(e) => setBoardCode(e.target.value)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500 text-center">
              {boardMode?.kind === 'passenger'
                ? `Scan the QR code on ${boardMode.passenger.first_name}’s phone.`
                : 'Scan each passenger’s QR code. Keep scanning — the camera stays on.'}
            </p>
            <video ref={videoRef} className="w-full aspect-square rounded-lg bg-gray-900 object-cover" />
            {justBoarded && <p className="text-sm text-green-600 font-medium text-center">✓ {justBoarded} boarded</p>}
            {scanFeedback && <p className="text-sm text-red-600 text-center">{scanFeedback}</p>}
            {boardMutation.isPending && <p className="text-sm text-gray-500">Confirming…</p>}
          </div>
        )}
        {boardMode?.kind === 'passenger' && (
          <button
            type="button"
            className="mt-4 text-sm text-primary-600 font-medium text-center w-full py-2"
            onClick={() => { setManualEntry((v) => !v); setScanFeedback(null); }}
          >
            {manualEntry ? 'Scan QR code instead' : 'Enter code manually instead'}
          </button>
        )}
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

      {/* Start ride confirm */}
      <ConfirmDialog
        open={startTripOpen}
        onClose={() => setStartTripOpen(false)}
        onConfirm={() => activeRide && startTripMutation.mutate(activeRide.id)}
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
        onConfirm={() => activeRide && endTripMutation.mutate(activeRide.id)}
        loading={endTripMutation.isPending}
        title="End this ride?"
        message={`Passengers who boarded (${boardedCount}) will be marked completed. This can't be undone.`}
        confirmLabel="End Ride"
      />

      {/* Chat */}
      {activeRide && (
        <ChatModal ride={activeRide} passenger={chatTarget} onClose={() => setChatTarget(null)} />
      )}
    </div>
  );
}

function ChatModal({ ride, passenger, onClose }: { ride: Ride; passenger: Passenger | null; onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const open = !!passenger;
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', ride.id, passenger?.user_id],
    queryFn: () => ridesApi.getChatMessages(ride.id, passenger!.user_id),
    enabled: open,
    refetchInterval: open ? 4_000 : false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, open]);

  const sendMutation = useMutation({
    mutationFn: (message: string) => ridesApi.sendChatMessage(ride.id, passenger!.user_id, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', ride.id, passenger?.user_id] });
      setDraft('');
    },
    onError: (e) => toast.error('Message not sent', getErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title={passenger ? `${passenger.first_name} ${passenger.last_name}` : 'Chat'} size="md">
      <div className="flex flex-col gap-3">
        <div className="h-[50dvh] sm:h-80 overflow-y-auto flex flex-col gap-2 bg-gray-50 rounded-lg p-3">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center my-auto">No messages yet — say hello.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                m.sender_type === 'marshal'
                  ? 'self-end bg-primary-600 text-white'
                  : 'self-start bg-white border border-gray-200 text-gray-800',
              )}
            >
              {m.message}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex items-center gap-2">
          {/* text-base on phones: iOS Safari zooms the page on focus for inputs under 16px */}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) sendMutation.mutate(draft.trim());
            }}
            placeholder="Type a message…"
            className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button
            icon={<Send className="w-4 h-4" />}
            disabled={!draft.trim()}
            loading={sendMutation.isPending}
            onClick={() => draft.trim() && sendMutation.mutate(draft.trim())}
          >
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
