import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Shield, X, Image as ImageIcon, FileText, Trash2, Upload } from 'lucide-react';
import { busesApi } from '../api/busesApi';
import { driversApi } from '@/features/drivers/api/driversApi';
import { adminsApi } from '@/features/admins/api/adminsApi';
import { SeatLayoutConfig } from './SeatLayoutDesigner';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { PageSpinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, fileToDataUrl, getErrorMessage, slugToLabel } from '@/lib/utils';
import { Card } from '@/components/ui/Tabs';
import { busTripStatus } from '@/types';
import type { BusDocument, SeatLayout } from '@/types';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'layout', label: 'Seat Layout' },
  { key: 'documents', label: 'Documents' },
];

export function BusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showAssignMarshal, setShowAssignMarshal] = useState(false);
  const [selectedMarshal, setSelectedMarshal] = useState('');
  const [showEditInsurance, setShowEditInsurance] = useState(false);
  const [insuranceIncorporationDate, setInsuranceIncorporationDate] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [insuranceFile, setInsuranceFile] = useState<string | null>(null);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docImage, setDocImage] = useState<string | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<BusDocument | null>(null);
  const pictureInputRef = useRef<HTMLInputElement>(null);

  const { data: bus, isLoading } = useQuery({
    queryKey: ['bus', id],
    queryFn: () => busesApi.get(id!),
    enabled: !!id,
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['bus-documents', id],
    queryFn: () => busesApi.listDocuments(id!),
    enabled: !!id && tab === 'documents',
  });

  const { data: availableDrivers = [] } = useQuery({
    queryKey: ['drivers-available'],
    queryFn: () => driversApi.listAvailable(),
    enabled: showAssignDriver,
  });

  const { data: marshals = [] } = useQuery({
    queryKey: ['admins-marshals'],
    queryFn: () => adminsApi.listMarshals(),
  });

  const assignDriverMutation = useMutation({
    mutationFn: (driverId: string) => busesApi.assignDriver(id!, driverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Driver assigned');
      setShowAssignDriver(false);
      setSelectedDriver('');
    },
    onError: (e) => toast.error('Failed to assign driver', getErrorMessage(e)),
  });

  const unassignDriverMutation = useMutation({
    mutationFn: () => busesApi.unassignDriver(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Driver removed');
    },
    onError: (e) => toast.error('Failed to remove driver', getErrorMessage(e)),
  });

  const assignMarshalMutation = useMutation({
    mutationFn: (marshalId: string) => busesApi.assignMarshal(id!, marshalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Marshal assigned');
      setShowAssignMarshal(false);
      setSelectedMarshal('');
    },
    onError: (e) => toast.error('Failed to assign marshal', getErrorMessage(e)),
  });

  const unassignMarshalMutation = useMutation({
    mutationFn: (marshalId: string) => busesApi.unassignMarshal(id!, marshalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Marshal removed');
    },
    onError: (e) => toast.error('Failed to remove marshal', getErrorMessage(e)),
  });

  const updateLayoutMutation = useMutation({
    mutationFn: (layout: SeatLayout) => busesApi.updateLayout(id!, layout),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Seat layout saved');
    },
    onError: (e) => toast.error('Failed to save layout', getErrorMessage(e)),
  });

  const updatePictureMutation = useMutation({
    mutationFn: (picture: string) => busesApi.update(id!, { picture }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Bus picture updated');
    },
    onError: (e) => toast.error('Failed to update picture', getErrorMessage(e)),
  });

  const updateInsuranceMutation = useMutation({
    mutationFn: (payload: { insurance_document?: string; insurance_incorporation_date?: string; insurance_expiry_date?: string }) =>
      busesApi.update(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus', id] });
      toast.success('Insurance details saved');
      setShowEditInsurance(false);
      setInsuranceFile(null);
    },
    onError: (e) => toast.error('Failed to save insurance details', getErrorMessage(e)),
  });

  const addDocumentMutation = useMutation({
    mutationFn: (payload: { title: string; image: string }) => busesApi.addDocument(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-documents', id] });
      toast.success('Document added');
      setShowAddDocument(false);
      setDocTitle('');
      setDocImage(null);
    },
    onError: (e) => toast.error('Failed to add document', getErrorMessage(e)),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => busesApi.deleteDocument(id!, documentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bus-documents', id] });
      toast.success('Document removed');
      setDeleteDocument(null);
    },
    onError: (e) => toast.error('Failed to remove document', getErrorMessage(e)),
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
                  ['Bus Type', bus.bus_type ? slugToLabel(bus.bus_type) : '—'],
                  ['Capacity', `${bus.capacity} seats`],
                  ['Trip Status', <Badge key="s" variant={statusBadge(busTripStatus(bus))} dot>{slugToLabel(busTripStatus(bus))}</Badge>],
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
            <Card className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Marshals</h3>
                <Button size="sm" onClick={() => setShowAssignMarshal(true)}>Assign Marshal</Button>
              </div>
              {bus.marshal_ids.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {bus.marshal_ids.map((marshalId) => {
                    const marshal = marshals.find((m) => m.id === marshalId);
                    return (
                      <div key={marshalId} className="flex items-center justify-between gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{marshal ? `${marshal.first_name} ${marshal.last_name}` : 'Marshal'}</p>
                            <p className="text-xs text-gray-500">{marshal?.email ?? marshalId}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => unassignMarshalMutation.mutate(marshalId)}
                          disabled={unassignMarshalMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No marshals currently assigned to this bus.</p>
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

        {tab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Bus Picture</h3>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  loading={updatePictureMutation.isPending}
                  onClick={() => pictureInputRef.current?.click()}
                >
                  {bus.picture ? 'Replace' : 'Upload'}
                </Button>
                <input
                  ref={pictureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await fileToDataUrl(file);
                    updatePictureMutation.mutate(dataUrl);
                    e.target.value = '';
                  }}
                />
              </div>
              {bus.picture ? (
                <img src={bus.picture} alt={bus.plate_number} className="w-full h-48 object-cover rounded-lg" />
              ) : (
                <div className="w-full h-48 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm">No picture uploaded</p>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Insurance</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  setInsuranceIncorporationDate(bus.insurance_incorporation_date?.split('T')[0] ?? '');
                  setInsuranceExpiryDate(bus.insurance_expiry_date?.split('T')[0] ?? '');
                  setInsuranceFile(null);
                  setShowEditInsurance(true);
                }}>
                  {bus.insurance_document ? 'Edit' : 'Add'}
                </Button>
              </div>
              {bus.insurance_document ? (
                <img src={bus.insurance_document} alt="Insurance document" className="w-full h-32 object-cover rounded-lg mb-3" />
              ) : (
                <div className="w-full h-32 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 mb-3">
                  <FileText className="w-8 h-8" />
                  <p className="text-sm">No insurance document uploaded</p>
                </div>
              )}
              <dl className="space-y-2">
                {[
                  ['Incorporation Date', bus.insurance_incorporation_date ? formatDate(bus.insurance_incorporation_date) : '—'],
                  ['Expiry Date', bus.insurance_expiry_date ? formatDate(bus.insurance_expiry_date) : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Documents</h3>
                <Button size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setShowAddDocument(true)}>Add Document</Button>
              </div>
              {documentsLoading ? (
                <p className="text-sm text-gray-500">Loading documents…</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-gray-500">No documents uploaded for this bus.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="relative border border-gray-200 rounded-lg overflow-hidden group">
                      <img src={doc.image} alt={doc.title} className="w-full h-28 object-cover" />
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate">{doc.title}</p>
                      </div>
                      <button
                        onClick={() => setDeleteDocument(doc)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 hover:bg-red-50 text-gray-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
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

      <Modal
        open={showAssignMarshal}
        onClose={() => { setShowAssignMarshal(false); setSelectedMarshal(''); }}
        title="Assign Marshal"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowAssignMarshal(false); setSelectedMarshal(''); }}>Cancel</Button>
            <Button onClick={() => assignMarshalMutation.mutate(selectedMarshal)} loading={assignMarshalMutation.isPending} disabled={!selectedMarshal}>Assign</Button>
          </>
        }
      >
        <Select
          label="Select Marshal"
          value={selectedMarshal}
          onChange={(e) => setSelectedMarshal(e.target.value)}
          options={marshals
            .filter((m) => m.is_active && !bus.marshal_ids.includes(m.id))
            .map((m) => ({ value: m.id, label: `${m.first_name} ${m.last_name} — ${m.email}` }))}
          placeholder="Choose a marshal"
        />
      </Modal>

      <Modal
        open={showEditInsurance}
        onClose={() => { setShowEditInsurance(false); setInsuranceFile(null); }}
        title="Insurance Details"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowEditInsurance(false); setInsuranceFile(null); }}>Cancel</Button>
            <Button
              loading={updateInsuranceMutation.isPending}
              onClick={() => updateInsuranceMutation.mutate({
                ...(insuranceFile ? { insurance_document: insuranceFile } : {}),
                insurance_incorporation_date: insuranceIncorporationDate,
                insurance_expiry_date: insuranceExpiryDate,
              })}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Insurance Document</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setInsuranceFile(await fileToDataUrl(file));
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Incorporation Date"
              type="date"
              value={insuranceIncorporationDate}
              onChange={(e) => setInsuranceIncorporationDate(e.target.value)}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={insuranceExpiryDate}
              onChange={(e) => setInsuranceExpiryDate(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showAddDocument}
        onClose={() => { setShowAddDocument(false); setDocTitle(''); setDocImage(null); }}
        title="Add Document"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowAddDocument(false); setDocTitle(''); setDocImage(null); }}>Cancel</Button>
            <Button
              loading={addDocumentMutation.isPending}
              disabled={!docTitle || !docImage}
              onClick={() => addDocumentMutation.mutate({ title: docTitle, image: docImage! })}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Document Title" placeholder="e.g. Roadworthiness Certificate" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setDocImage(await fileToDataUrl(file));
              }}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteDocument}
        onClose={() => setDeleteDocument(null)}
        onConfirm={() => deleteDocumentMutation.mutate(deleteDocument!.id)}
        loading={deleteDocumentMutation.isPending}
        message={`Remove document "${deleteDocument?.title}"?`}
      />
    </div>
  );
}
