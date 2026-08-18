import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Mail, Phone, MapPin, AlertCircle, Car, Star,
  Calendar, FileText, CheckCircle, XCircle, Power
} from 'lucide-react';
import { driversApi } from '../api/driversApi';
import { busesApi } from '@/features/buses/api/busesApi';
import { ridesApi } from '@/features/rides/api/ridesApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage, slugToLabel } from '@/lib/utils';
import { Card } from '@/components/ui/Tabs';
import { DriverForm } from './DriversPage';
import type { Driver } from '@/types';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'documents', label: 'Documents' },
  { key: 'performance', label: 'Performance' },
  { key: 'assignment', label: 'Assignment' },
];

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showAssignBus, setShowAssignBus] = useState(false);
  const [showAssignRide, setShowAssignRide] = useState(false);
  const [selectedBus, setSelectedBus] = useState('');
  const [selectedRide, setSelectedRide] = useState('');
  const [confirm, setConfirm] = useState<{ action: string } | null>(null);

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driversApi.get(id!),
    enabled: !!id,
  });

  const { data: buses = [] } = useQuery({
    queryKey: ['buses-available'],
    queryFn: () => busesApi.list(),
    enabled: showAssignBus,
  });

  const { data: rides = [] } = useQuery({
    queryKey: ['rides'],
    queryFn: () => ridesApi.list({ skip: 0, limit: 50 }),
    enabled: showAssignRide,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Driver>) => driversApi.update(id!, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Driver updated'); setShowEdit(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const approveMutation = useMutation({
    mutationFn: () => driversApi.approve(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Driver approved'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => driversApi.reject(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Driver rejected'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const suspendMutation = useMutation({
    mutationFn: () => driversApi.suspend(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Driver suspended'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const reinstateMutation = useMutation({
    mutationFn: () => driversApi.reinstate(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Driver reinstated'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const setAvailableMutation = useMutation({
    mutationFn: () => driversApi.setAvailable(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Driver set available'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const setUnavailableMutation = useMutation({
    mutationFn: () => driversApi.setUnavailable(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Driver set unavailable'); setConfirm(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const assignBusMutation = useMutation({
    mutationFn: (busId: string) => Promise.all([
      driversApi.assignBus(id!, busId),
      busesApi.assignDriver(busId, id!),
    ]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Bus assigned'); setShowAssignBus(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const removeBusMutation = useMutation({
    mutationFn: () => Promise.all([
      driversApi.removeBus(id!),
      ...(driver?.assigned_bus_id ? [busesApi.unassignDriver(driver.assigned_bus_id)] : []),
    ]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Bus removed'); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const assignRideMutation = useMutation({
    mutationFn: (rideId: string) => driversApi.assignRide(id!, rideId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver', id] }); toast.success('Ride assigned'); setShowAssignRide(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const handleAction = () => {
    if (!confirm) return;
    if (confirm.action === 'approve') approveMutation.mutate();
    else if (confirm.action === 'reject') rejectMutation.mutate();
    else if (confirm.action === 'suspend') suspendMutation.mutate();
    else if (confirm.action === 'reinstate') reinstateMutation.mutate();
    else if (confirm.action === 'set_available') setAvailableMutation.mutate();
    else if (confirm.action === 'set_unavailable') setUnavailableMutation.mutate();
  };

  if (isLoading) return <PageSpinner />;
  if (!driver) return null;

  const isPending = approveMutation.isPending || rejectMutation.isPending || suspendMutation.isPending
    || reinstateMutation.isPending || setAvailableMutation.isPending || setUnavailableMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <Header title="Driver Profile" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          Back to Drivers
        </Button>

        {/* Profile hero */}
        <Card className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold flex-shrink-0">
            {driver.first_name[0]}{driver.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{driver.first_name} {driver.last_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{driver.driver_type ? slugToLabel(driver.driver_type) : 'Driver'}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusBadge(driver.verification_status)} dot>{slugToLabel(driver.verification_status)}</Badge>
                <Badge variant={statusBadge(driver.status)} dot>{slugToLabel(driver.status)}</Badge>
                <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>Edit Profile</Button>
                {(driver.verification_status === 'pending' || driver.verification_status === 'under_review') && (
                  <>
                    <Button size="sm" icon={<CheckCircle className="w-4 h-4" />} onClick={() => setConfirm({ action: 'approve' })}>Approve</Button>
                    <Button variant="danger" size="sm" icon={<XCircle className="w-4 h-4" />} onClick={() => setConfirm({ action: 'reject' })}>Reject</Button>
                  </>
                )}
                {driver.status !== 'suspended' && driver.verification_status === 'approved' && (
                  <Button variant="danger" size="sm" onClick={() => setConfirm({ action: 'suspend' })}>Suspend</Button>
                )}
                {driver.status === 'suspended' && (
                  <Button variant="primary" size="sm" onClick={() => setConfirm({ action: 'reinstate' })}>Reinstate</Button>
                )}
                {driver.status === 'offline' && driver.verification_status === 'approved' && (
                  <Button variant="primary" size="sm" icon={<Power className="w-4 h-4" />} onClick={() => setConfirm({ action: 'set_available' })}>
                    Set Available
                  </Button>
                )}
                {driver.status === 'available' && driver.verification_status === 'approved' && (
                  <Button variant="outline" size="sm" icon={<Power className="w-4 h-4" />} onClick={() => setConfirm({ action: 'set_unavailable' })}>
                    Set Unavailable
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{driver.email}</div>
              <div className="flex items-center gap-1.5 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{driver.phone}</div>
              {driver.address && <div className="flex items-center gap-1.5 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{driver.address}</div>}
              {driver.rating && <div className="flex items-center gap-1.5 text-sm text-gray-600"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{driver.rating.toFixed(1)} rating</div>}
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
                  ['Full Name', `${driver.first_name} ${driver.last_name}`],
                  ['Email', driver.email],
                  ['Phone', driver.phone],
                  ['Address', driver.address ?? '—'],
                  ['Emergency Contact', driver.emergency_contact ?? '—'],
                  ['Next of Kin', driver.next_of_kin ?? '—'],
                  ['Joined', formatDate(driver.created_at)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">License & Verification</h3>
              <dl className="space-y-3">
                {[
                  ['License Number', driver.license_number],
                  ['License Expiry', formatDate(driver.license_expiry)],
                  ['Driver Type', driver.driver_type ? slugToLabel(driver.driver_type) : '—'],
                  ['Verification', <Badge key="v" variant={statusBadge(driver.verification_status)} dot>{slugToLabel(driver.verification_status)}</Badge>],
                  ['Availability', <Badge key="a" variant={statusBadge(driver.status)} dot>{slugToLabel(driver.status)}</Badge>],
                  ['Total Trips', driver.total_trips ?? 0],
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

        {tab === 'documents' && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Driver Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Driver License', icon: <FileText className="w-5 h-5 text-primary-600" />, status: 'uploaded' },
                { label: 'National ID', icon: <FileText className="w-5 h-5 text-primary-600" />, status: driver.license_number ? 'uploaded' : 'missing' },
                { label: 'Medical Certificate', icon: <AlertCircle className="w-5 h-5 text-amber-500" />, status: 'pending' },
                { label: 'Profile Photo', icon: <FileText className="w-5 h-5 text-primary-600" />, status: driver.photo_url ? 'uploaded' : 'missing' },
              ].map((doc) => (
                <div key={doc.label} className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0">{doc.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                    <Badge variant={doc.status === 'uploaded' ? 'success' : doc.status === 'pending' ? 'warning' : 'danger'} className="mt-1">
                      {slugToLabel(doc.status)}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm">
                    {doc.status === 'uploaded' ? 'View' : 'Upload'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === 'performance' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Trips', value: driver.total_trips ?? 0, icon: <Car className="w-5 h-5 text-primary-600" /> },
              { label: 'Avg Rating', value: driver.rating ? `${driver.rating.toFixed(1)} / 5.0` : 'N/A', icon: <Star className="w-5 h-5 text-amber-500" /> },
              { label: 'Assigned Bus', value: driver.assigned_bus_id ? 'Yes' : 'None', icon: <Car className="w-5 h-5 text-blue-600" /> },
              { label: 'License Valid Until', value: formatDate(driver.license_expiry), icon: <Calendar className="w-5 h-5 text-green-600" /> },
            ].map((item) => (
              <Card key={item.label} className="flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">{item.icon}</div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
              </Card>
            ))}
          </div>
        )}

        {tab === 'assignment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Bus Assignment</h3>
                <div className="flex gap-2">
                  {driver.assigned_bus_id && (
                    <Button variant="danger" size="sm" onClick={() => removeBusMutation.mutate()} loading={removeBusMutation.isPending}>Remove</Button>
                  )}
                  <Button size="sm" onClick={() => setShowAssignBus(true)}>Assign Bus</Button>
                </div>
              </div>
              {driver.assigned_bus_id ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Car className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Bus assigned</p>
                    <p className="text-xs text-gray-500">{driver.assigned_bus_id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No bus currently assigned.</p>
              )}
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Ride Assignment</h3>
                <Button size="sm" onClick={() => setShowAssignRide(true)}>Assign Ride</Button>
              </div>
              {driver.assigned_ride_id ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">On active ride</p>
                    <p className="text-xs text-gray-500">{driver.assigned_ride_id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No ride currently assigned.</p>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Edit driver modal */}
      <DriverForm
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSubmit={(p) => updateMutation.mutate(p)}
        loading={updateMutation.isPending}
        defaultValues={driver}
        isEdit
      />

      {/* Assign bus modal */}
      <Modal
        open={showAssignBus}
        onClose={() => setShowAssignBus(false)}
        title="Assign Bus"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAssignBus(false)}>Cancel</Button>
            <Button onClick={() => assignBusMutation.mutate(selectedBus)} loading={assignBusMutation.isPending} disabled={!selectedBus}>Assign</Button>
          </>
        }
      >
        <Select
          label="Select Bus"
          value={selectedBus}
          onChange={(e) => setSelectedBus(e.target.value)}
          options={buses.map((b) => ({ value: b.id, label: `${b.plate_number} — ${b.model}` }))}
          placeholder="Choose a bus"
        />
      </Modal>

      {/* Assign ride modal */}
      <Modal
        open={showAssignRide}
        onClose={() => setShowAssignRide(false)}
        title="Assign Ride"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAssignRide(false)}>Cancel</Button>
            <Button onClick={() => assignRideMutation.mutate(selectedRide)} loading={assignRideMutation.isPending} disabled={!selectedRide}>Assign</Button>
          </>
        }
      >
        <Select
          label="Select Ride"
          value={selectedRide}
          onChange={(e) => setSelectedRide(e.target.value)}
          options={rides.map((r) => ({ value: r.id, label: `${r.id} — ${formatDate(r.departure_time)}` }))}
          placeholder="Choose a ride"
        />
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        loading={isPending}
        confirmVariant={confirm?.action === 'approve' || confirm?.action === 'reinstate' || confirm?.action === 'set_available' || confirm?.action === 'set_unavailable' ? 'primary' : 'danger'}
        confirmLabel={confirm?.action ? slugToLabel(confirm.action) : 'Confirm'}
        message={`Confirm: ${confirm?.action} driver "${driver.first_name} ${driver.last_name}"?`}
      />
    </div>
  );
}
