import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User } from 'lucide-react';
import { busesApi } from '../api/busesApi';
import { driversApi } from '@/features/drivers/api/driversApi';
import { SeatLayoutConfig } from './SeatLayoutDesigner';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage, slugToLabel } from '@/lib/utils';
import { Card } from '@/components/ui/Tabs';
import type { SeatLayout } from '@/types';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'layout', label: 'Seat Layout' },
];

export function BusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');

  const { data: bus, isLoading } = useQuery({
    queryKey: ['bus', id],
    queryFn: () => busesApi.get(id!),
    enabled: !!id,
  });

  const { data: availableDrivers = [] } = useQuery({
    queryKey: ['drivers-available'],
    queryFn: () => driversApi.listAvailable(),
    enabled: showAssignDriver,
  });

  const assignDriverMutation = useMutation({
    mutationFn: (driverId: string) => Promise.all([
      busesApi.assignDriver(id!, driverId),
      driversApi.assignBus(driverId, id!),
    ]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Driver assigned');
      setShowAssignDriver(false);
      setSelectedDriver('');
    },
    onError: (e) => toast.error('Failed to assign driver', getErrorMessage(e)),
  });

  const unassignDriverMutation = useMutation({
    mutationFn: () => Promise.all([
      busesApi.unassignDriver(id!),
      ...(bus?.driver_id ? [driversApi.removeBus(bus.driver_id)] : []),
    ]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Driver removed');
    },
    onError: (e) => toast.error('Failed to remove driver', getErrorMessage(e)),
  });

  const updateLayoutMutation = useMutation({
    mutationFn: (layout: SeatLayout) => busesApi.updateLayout(id!, layout),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Seat layout saved');
    },
    onError: (e) => toast.error('Failed to save layout', getErrorMessage(e)),
  });

  if (isLoading) return <PageSpinner />;
  if (!bus) return null;

  return (
    <div className="flex flex-col h-full">
      <Header title="Bus Details" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
          Back to Buses
        </Button>

        <Card className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{bus.plate_number}</h2>
              <Badge variant={statusBadge(bus.status)} dot>{slugToLabel(bus.status)}</Badge>
            </div>
            <p className="text-sm text-gray-600">{bus.model}</p>
          </div>
          <div className="flex items-center gap-2">
            {bus.status === 'maintenance' ? (
              <Button variant="primary" size="sm" onClick={() => busesApi.update(bus.id, { status: 'active' })}>Set Active</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => busesApi.update(bus.id, { status: 'maintenance' })}>Set Maintenance</Button>
            )}
          </div>
        </Card>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Bus Information</h3>
              <dl className="space-y-3">
                {[
                  ['Plate Number', bus.plate_number],
                  ['Model', bus.model],
                  ['Capacity', `${bus.capacity} seats`],
                  ['Status', <Badge key="s" variant={statusBadge(bus.status)} dot>{slugToLabel(bus.status)}</Badge>],
                  ['Added', formatDate(bus.created_at)],
                  ['Updated', formatDate(bus.updated_at)],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between gap-4 items-center">
                    <dt className="text-sm text-gray-500">{label as string}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">{value as string}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Layout Summary</h3>
              {bus.layout ? (
                <dl className="space-y-3">
                  {[
                    ['Rows', bus.layout.rows],
                    ['Columns', bus.layout.cols],
                    ['Total Seats', bus.layout.seats.filter(s => s.seat_type !== 'walkway' && s.seat_type !== 'empty').length],
                    ['Standard Seats', bus.layout.seats.filter(s => s.seat_type === 'standard').length],
                    ['Premium Seats', bus.layout.seats.filter(s => s.seat_type === 'premium').length],
                    ['Disabled Seats', bus.layout.seats.filter(s => s.seat_type === 'disabled').length],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between gap-4">
                      <dt className="text-sm text-gray-500">{label as string}</dt>
                      <dd className="text-sm font-medium text-gray-900">{value as string}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">No seat layout configured. Go to the "Seat Layout" tab to configure.</p>
              )}
            </Card>
            <Card className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Driver Assignment</h3>
                <div className="flex gap-2">
                  {bus.driver_id && (
                    <Button variant="danger" size="sm" onClick={() => unassignDriverMutation.mutate()} loading={unassignDriverMutation.isPending}>
                      Remove Driver
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setShowAssignDriver(true)}>
                    {bus.driver_id ? 'Reassign Driver' : 'Assign Driver'}
                  </Button>
                </div>
              </div>
              {bus.driver_id ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Driver assigned</p>
                    <p className="text-xs text-gray-500">{bus.driver_id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No driver currently assigned to this bus.</p>
              )}
            </Card>
          </div>
        )}

        {tab === 'layout' && (
          <Card>
            <h3 className="font-semibold text-gray-900 mb-2">Seat Layout Designer</h3>
            <p className="text-sm text-gray-500 mb-4">
              Configure the physical seat arrangement for this bus. This layout is used directly by passengers during booking.
            </p>
            <SeatLayoutConfig
              onSave={(layout) => updateLayoutMutation.mutate(layout)}
              initialLayout={bus.layout}
              loading={updateLayoutMutation.isPending}
            />
          </Card>
        )}
      </div>

      <Modal
        open={showAssignDriver}
        onClose={() => { setShowAssignDriver(false); setSelectedDriver(''); }}
        title="Assign Driver"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowAssignDriver(false); setSelectedDriver(''); }}>Cancel</Button>
            <Button onClick={() => assignDriverMutation.mutate(selectedDriver)} loading={assignDriverMutation.isPending} disabled={!selectedDriver}>Assign</Button>
          </>
        }
      >
        <Select
          label="Select Driver"
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
          options={availableDrivers.map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name} — ${d.license_number}` }))}
          placeholder="Choose a driver"
        />
      </Modal>
    </div>
  );
}
