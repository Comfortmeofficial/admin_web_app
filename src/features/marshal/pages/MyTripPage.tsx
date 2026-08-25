import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QrScanner from 'qr-scanner';
import { Calendar, CheckCircle, MessageCircle, Phone, Send, ShieldAlert, XCircle } from 'lucide-react';
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
import { Card } from '@/components/ui/Tabs';
import { cn, formatDateTime, getErrorMessage, slugToLabel } from '@/lib/utils';
import type { Passenger, Ride } from '@/types';

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

export function MyTripPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [boardTarget, setBoardTarget] = useState<Passenger | null>(null);
  const [boardCode, setBoardCode] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cancelTarget, setCancelTarget] = useState<Passenger | null>(null);
  const [chatTarget, setChatTarget] = useState<Passenger | null>(null);

  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['rides', 'mine'],
    queryFn: () => ridesApi.mine(),
    refetchInterval: 30_000,
  });

  const activeRide = selectedRide ?? rides[0] ?? null;

  const { data: passengers = [], isLoading: passengersLoading } = useQuery({
    queryKey: ['ride-passengers', activeRide?.id],
    queryFn: () => ridesApi.getPassengers(activeRide!.id),
    enabled: !!activeRide,
    refetchInterval: 15_000,
  });

  const closeBoardModal = () => {
    setBoardTarget(null);
    setBoardCode('');
    setManualEntry(false);
    setScanFeedback(null);
  };

  const boardMutation = useMutation({
    mutationFn: ({ bookingId, code }: { bookingId: string; code: string }) => bookingsApi.board(bookingId, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', activeRide?.id] });
      toast.success('Passenger boarded');
      closeBoardModal();
    },
    onError: (e) => {
      toast.error('Failed', getErrorMessage(e));
      setScanFeedback(null);
    },
  });

  // Runs the camera scanner whenever the board modal is open in scan mode;
  // torn down on close/manual-toggle so the camera light doesn't stay on.
  useEffect(() => {
    if (!boardTarget || manualEntry) return;
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
        if (parsed.bookingId !== boardTarget.booking_id) {
          setScanFeedback('That QR belongs to a different passenger.');
          return;
        }
        setScanFeedback(null);
        scanner.stop();
        boardMutation.mutate({ bookingId: String(boardTarget.booking_id), code: parsed.reference });
      },
      { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true },
    );
    scanner.start().catch(() => setScanFeedback('Camera access is needed to scan the code.'));

    return () => {
      scanner.stop();
      scanner.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardTarget, manualEntry]);

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ride-passengers', activeRide?.id] });
      toast.success('Booking cancelled');
      setCancelTarget(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const endTripMutation = useMutation({
    mutationFn: (rideId: string) => ridesApi.endTrip(rideId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rides', 'mine'] });
      toast.success('Trip ended');
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

  return (
    <div className="flex flex-col h-full">
      <Header title="My Trip" subtitle="Passengers on the trip you're conducting" />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {rides.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            {rides.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRide(r)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium border',
                  activeRide?.id === r.id
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                )}
              >
                {formatDateTime(r.departure_time)}
              </button>
            ))}
          </div>
        )}

        {activeRide && (
          <Card className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{formatDateTime(activeRide.departure_time)}</p>
                <p className="text-xs text-gray-500">
                  {activeRide.bus_plate ?? 'Bus TBD'} · {activeRide.driver_name ?? 'Driver TBD'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusBadge(activeRide.status)} dot>{slugToLabel(activeRide.status)}</Badge>
              {activeRide.status === 'active' && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={endTripMutation.isPending}
                  onClick={() => endTripMutation.mutate(activeRide.id)}
                >
                  End Trip
                </Button>
              )}
            </div>
          </Card>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Passengers</h3>
            <span className="text-sm text-gray-400 ml-1">({passengers.length})</span>
          </div>

          {passengersLoading ? (
            <PageSpinner />
          ) : passengers.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 py-8 text-center">No passengers booked yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {passengers.map((p) => (
                <div key={p.booking_id} className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {p.first_name} {p.last_name} <span className="text-gray-400 font-normal">· Seat {p.seat_number}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {p.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" /> {p.phone}
                        </span>
                      )}
                      <Badge variant={p.is_on_board ? 'success' : 'gray'}>{p.is_on_board ? 'On Board' : 'Not Boarded'}</Badge>
                      <Badge variant={statusBadge(p.status)} dot>{slugToLabel(p.status)}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" icon={<MessageCircle className="w-4 h-4" />} onClick={() => setChatTarget(p)}>
                      Chat
                    </Button>
                    {!p.is_on_board && p.status === 'confirmed' && (
                      <Button size="sm" icon={<CheckCircle className="w-4 h-4" />} onClick={() => setBoardTarget(p)}>
                        Board
                      </Button>
                    )}
                    {p.status !== 'cancelled' && (
                      <Button size="sm" variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => setCancelTarget(p)}>
                        Cancel
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
        open={!!boardTarget}
        onClose={closeBoardModal}
        title={`Board ${boardTarget?.first_name ?? ''}`}
        size="sm"
        footer={
          manualEntry ? (
            <>
              <Button variant="outline" onClick={closeBoardModal}>Cancel</Button>
              <Button
                onClick={() => boardTarget && boardMutation.mutate({ bookingId: String(boardTarget.booking_id), code: boardCode })}
                loading={boardMutation.isPending}
                disabled={!boardCode.trim()}
              >
                Confirm
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={closeBoardModal} className="w-full">Cancel</Button>
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
              Scan the QR code on {boardTarget?.first_name ?? 'the passenger'}&rsquo;s phone.
            </p>
            <video ref={videoRef} className="w-full aspect-square rounded-lg bg-gray-900 object-cover" />
            {scanFeedback && <p className="text-sm text-red-600 text-center">{scanFeedback}</p>}
            {boardMutation.isPending && <p className="text-sm text-gray-500">Confirming…</p>}
          </div>
        )}
        <button
          type="button"
          className="mt-4 text-sm text-primary-600 font-medium text-center w-full"
          onClick={() => { setManualEntry((v) => !v); setScanFeedback(null); }}
        >
          {manualEntry ? 'Scan QR code instead' : 'Enter code manually instead'}
        </button>
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

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', ride.id, passenger?.user_id],
    queryFn: () => ridesApi.getChatMessages(ride.id, passenger!.user_id),
    enabled: open,
    refetchInterval: open ? 4_000 : false,
  });

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
        <div className="h-80 overflow-y-auto flex flex-col gap-2 bg-gray-50 rounded-lg p-3">
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
        </div>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) sendMutation.mutate(draft.trim());
            }}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button
            icon={<Send className="w-4 h-4" />}
            disabled={!draft.trim()}
            loading={sendMutation.isPending}
            onClick={() => draft.trim() && sendMutation.mutate(draft.trim())}
          >
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
}
