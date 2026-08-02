import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, XCircle, CheckCircle } from 'lucide-react';
import { bookingsApi } from '../api/bookingsApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, formatCurrency, getErrorMessage, slugToLabel } from '@/lib/utils';
import { Card } from '@/components/ui/Tabs';
import { useState } from 'react';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [showCancel, setShowCancel] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.get(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking', id] }); toast.success('Booking cancelled'); setShowCancel(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const boardMutation = useMutation({
    mutationFn: () => bookingsApi.board(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking', id] }); toast.success('Passenger boarded'); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  if (isLoading) return <PageSpinner />;
  if (!booking) return null;

  return (
    <div className="flex flex-col h-full">
      <Header title="Booking Details" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          Back to Bookings
        </Button>

        <Card className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold font-mono text-gray-900">{booking.reference}</h2>
              <Badge variant={statusBadge(booking.status)} dot>{slugToLabel(booking.status)}</Badge>
            </div>
            <p className="text-sm text-gray-500">{formatDateTime(booking.created_at)}</p>
          </div>
          <div className="flex items-center gap-2">
            {!booking.is_on_board && booking.status === 'confirmed' && (
              <Button size="sm" icon={<CheckCircle className="w-4 h-4" />} onClick={() => boardMutation.mutate()} loading={boardMutation.isPending}>
                Mark On Board
              </Button>
            )}
            {booking.status !== 'cancelled' && booking.status !== 'refunded' && (
              <Button variant="danger" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={() => setShowCancel(true)}>
                Cancel Booking
              </Button>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Booking Information</h3>
            <dl className="space-y-3">
              {[
                ['Reference', <span key="ref" className="font-mono">{booking.reference}</span>],
                ['Seat Number', booking.seat_number],
                ['Status', <Badge key="s" variant={statusBadge(booking.status)} dot>{slugToLabel(booking.status)}</Badge>],
                ['On Board', <Badge key="ob" variant={booking.is_on_board ? 'success' : 'gray'}>{booking.is_on_board ? 'Yes' : 'No'}</Badge>],
                ['Booking Date', formatDateTime(booking.created_at)],
                ['User ID', booking.user_id],
                ['Ride ID', booking.ride_id],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-4 items-center">
                  <dt className="text-sm text-gray-500">{label as string}</dt>
                  <dd className="text-sm font-medium text-gray-900 text-right">{value as string}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Payment Information</h3>
            <dl className="space-y-3">
              {[
                ['Base Amount', formatCurrency(booking.amount)],
                ['Discount', booking.discount_amount ? formatCurrency(booking.discount_amount) : '—'],
                ['Final Amount', formatCurrency(booking.final_amount)],
                ['Payment Method', <Badge key="pm" variant="gray">{slugToLabel(booking.payment_method)}</Badge>],
                ['Coupon Code', booking.coupon_code ?? '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-4 items-center">
                  <dt className="text-sm text-gray-500">{label as string}</dt>
                  <dd className="text-sm font-medium text-gray-900">{value as string}</dd>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <dt className="text-sm font-semibold text-gray-900">Total Paid</dt>
                  <dd className="text-sm font-bold text-gray-900">{formatCurrency(booking.final_amount)}</dd>
                </div>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
        message="Cancel this booking? The passenger may be eligible for a refund."
        confirmLabel="Cancel Booking"
      />
    </div>
  );
}
