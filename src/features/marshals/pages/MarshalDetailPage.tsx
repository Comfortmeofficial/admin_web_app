import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, MapPin, Car, Calendar, Trash2 } from 'lucide-react';
import { adminsApi } from '@/features/admins/api/adminsApi';
import { busesApi } from '@/features/buses/api/busesApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatDateTime, getErrorMessage, slugToLabel } from '@/lib/utils';
import { Card } from '@/components/ui/Tabs';
import { MarshalForm } from './MarshalsPage';
import { marshalTripStatus } from '@/types';

// Bus assignment happens only from the Buses page now, same as drivers —
// this profile is read-only for it.
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'performance', label: 'Performance' },
  { key: 'trips', label: 'Trip History' },
];

export function MarshalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [confirm, setConfirm] = useState<{ action: string } | null>(null);

  const { data: marshal, isLoading } = useQuery({
    queryKey: ['marshal', id],
    queryFn: () => adminsApi.getMarshal(id!),
    enabled: !!id,
  });

  const { data: buses = [] } = useQuery({
    queryKey: ['buses'],
    queryFn: () => busesApi.list(),
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['marshal-trips', id],
    queryFn: () => adminsApi.getTrips(id!),
    enabled: !!id && (tab === 'trips' || tab === 'performance'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof adminsApi.update>[1]) => adminsApi.update(id!, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marshal', id] }); toast.success('Marshal updated'); setShowEdit(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const suspendMutation = useMutation({
    mutationFn: () => adminsApi.suspend(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marshal', id] }); toast.success('Marshal suspended'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const reinstateMutation = useMutation({
    mutationFn: () => adminsApi.activate(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marshal', id] }); toast.success('Marshal reinstated'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminsApi.delete(id!),
    onSuccess: () => { toast.success('Marshal deleted'); navigate('/marshals'); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const handleAction = () => {
    if (!confirm) return;
    if (confirm.action === 'suspend') suspendMutation.mutate();
    else if (confirm.action === 'reinstate') reinstateMutation.mutate();
    else if (confirm.action === 'delete') deleteMutation.mutate();
  };

  if (isLoading) return <PageSpinner />;
  if (!marshal) return null;

  const isPending = suspendMutation.isPending || reinstateMutation.isPending || deleteMutation.isPending;
  const status = marshalTripStatus(marshal);
  const assignedPlates = marshal.assigned_bus_ids.map((busId) => buses.find((b) => b.id === busId)?.plate_number ?? busId);

  return (
    <div className="flex flex-col h-full">
      <Header title="Marshal Profile" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          Back to Bus Marshals
        </Button>

        {/* Profile hero */}
        <Card className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold flex-shrink-0">
            {marshal.first_name[0]}{marshal.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{marshal.first_name} {marshal.last_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Bus Marshal</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusBadge(status)} dot>{slugToLabel(status)}</Badge>
                <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>Edit Profile</Button>
                {marshal.is_active ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirm({ action: 'suspend' })}>Suspend</Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setConfirm({ action: 'reinstate' })}>Reinstate</Button>
                )}
                <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirm({ action: 'delete' })}>
                  Delete
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{marshal.email}</div>
              {marshal.phone && <div className="flex items-center gap-1.5 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{marshal.phone}</div>}
              {marshal.address && <div className="flex items-center gap-1.5 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{marshal.address}</div>}
            </div>
          </div>
        </Card>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
              <dl className="space-y-3">
                {[
                  ['Full Name', `${marshal.first_name} ${marshal.last_name}`],
                  ['Email', marshal.email],
                  ['Phone', marshal.phone ?? '—'],
                  ['Address', marshal.address ?? '—'],
                  ['Next of Kin', marshal.next_of_kin ?? '—'],
                  ['Next of Kin Phone', marshal.next_of_kin_phone ?? '—'],
                  ['Relationship', marshal.next_of_kin_relationship ?? '—'],
                  ['Joined', formatDate(marshal.created_at)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Assignment</h3>
              <dl className="space-y-3">
                {[
                  ['Trip Status', <Badge key="a" variant={statusBadge(status)} dot>{slugToLabel(status)}</Badge>],
                  ['Assigned Bus(es)', assignedPlates.length ? assignedPlates.join(', ') : 'None'],
                  ['Total Trips', trips.length],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between gap-4 items-center">
                    <dt className="text-sm text-gray-500">{label as string}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">{value as string}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        )}

        {tab === 'performance' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Trips', value: trips.length, icon: <Car className="w-5 h-5 text-primary-600" /> },
              {
                label: 'Total Upcoming Trips',
                value: trips.filter((t) => t.status === 'scheduled' || t.status === 'boarding').length,
                icon: <Calendar className="w-5 h-5 text-amber-500" />,
              },
              { label: 'Assigned Bus', value: assignedPlates.length ? 'Yes' : 'None', icon: <Car className="w-5 h-5 text-blue-600" /> },
            ].map((item) => (
              <Card key={item.label} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">{item.icon}</div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
              </Card>
            ))}
          </div>
        )}

        {tab === 'trips' && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Trip History</h3>
            {tripsLoading ? (
              <p className="text-sm text-gray-500">Loading trips…</p>
            ) : trips.length === 0 ? (
              <p className="text-sm text-gray-500">No trips yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-4 font-medium">Departure</th>
                      <th className="py-2 pr-4 font-medium">Route</th>
                      <th className="py-2 pr-4 font-medium">Bus</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr key={trip.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-4 text-gray-900">{formatDateTime(trip.departure_time)}</td>
                        <td className="py-2 pr-4 text-gray-600">{trip.route?.name ?? '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{trip.bus_plate ?? '—'}</td>
                        <td className="py-2 pr-4"><Badge variant={statusBadge(trip.status)} dot>{slugToLabel(trip.status)}</Badge></td>
                        <td className="py-2 pr-4 text-gray-600">₦{trip.fare.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Edit marshal modal */}
      <MarshalForm
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={(p) => updateMutation.mutate(p)}
        loading={updateMutation.isPending}
        defaultValues={marshal}
        isEdit
      />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={isPending}
        confirmVariant={confirm?.action === 'reinstate' ? 'primary' : 'danger'}
        confirmLabel={confirm?.action ? slugToLabel(confirm.action) : 'Confirm'}
        message={
          confirm?.action === 'delete'
            ? `Delete marshal "${marshal.first_name} ${marshal.last_name}"? This removes them from active use — for marshals who are no longer with the company.`
            : `Confirm: ${confirm?.action} marshal "${marshal.first_name} ${marshal.last_name}"?`
        }
      />
    </div>
  );
}
