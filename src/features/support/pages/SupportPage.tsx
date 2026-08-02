import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, MoreVertical } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, slugToLabel } from '@/lib/utils';
import { StatsCard } from '@/components/ui/Tabs';
import { HeadphonesIcon, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { SupportTicket } from '@/types';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: '1',
    reference: 'SUP-001',
    user_id: 'user-1',
    category: 'booking',
    subject: 'Unable to cancel booking',
    description: 'I tried to cancel my booking but it says the cancellation window has passed.',
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    reference: 'SUP-002',
    user_id: 'user-2',
    category: 'payment',
    subject: 'Payment deducted but booking not confirmed',
    description: 'I paid for a ticket but my booking is still showing as pending.',
    status: 'pending',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function SupportPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [tickets] = useState<SupportTicket[]>(MOCK_TICKETS);

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const pendingCount = tickets.filter((t) => t.status === 'pending').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  const filtered = tickets.filter((t) => {
    const matchesSearch = `${t.reference} ${t.subject} ${t.user_id}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusTab === 'all' || t.status === statusTab;
    return matchesSearch && matchesStatus;
  });

  const categoryColors: Record<string, 'info' | 'warning' | 'danger' | 'gray'> = {
    booking: 'info',
    payment: 'warning',
    driver: 'danger',
    general: 'gray',
    complaint: 'danger',
  };

  const columns: Column<SupportTicket>[] = [
    { key: 'ref', header: 'Reference', cell: (r) => <span className="font-mono text-xs font-semibold">{r.reference}</span> },
    { key: 'subject', header: 'Subject', cell: (r) => <p className="font-medium text-gray-900 max-w-xs truncate">{r.subject}</p> },
    {
      key: 'category', header: 'Category',
      cell: (r) => <Badge variant={categoryColors[r.category] ?? 'gray'}>{slugToLabel(r.category)}</Badge>,
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>,
    },
    { key: 'assigned', header: 'Assigned To', cell: (r) => r.assigned_to ?? <span className="text-gray-400">Unassigned</span> },
    { key: 'date', header: 'Created', cell: (r) => formatDateTime(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <button onClick={(e) => { e.stopPropagation(); setSelectedTicket(row); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <MoreVertical className="w-4 h-4" />
        </button>
      ),
      className: 'w-12',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Customer Support" subtitle="Manage support tickets and passenger complaints" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Open Tickets" value={openCount} icon={<AlertCircle className="w-5 h-5 text-red-600" />} iconBg="bg-red-100" />
          <StatsCard label="Pending" value={pendingCount} icon={<Clock className="w-5 h-5 text-amber-600" />} iconBg="bg-amber-100" />
          <StatsCard label="Resolved" value={resolvedCount} icon={<CheckCircle className="w-5 h-5 text-green-600" />} iconBg="bg-green-100" />
          <StatsCard label="Total Tickets" value={tickets.length} icon={<HeadphonesIcon className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-100" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Support Tickets</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search tickets…" className="w-56" />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Create Ticket</Button>
            </div>
          </div>
          <div className="px-5 pt-3 border-b border-gray-100">
            <Tabs tabs={STATUS_TABS} active={statusTab} onChange={setStatusTab} />
          </div>
          <Table
            columns={columns}
            data={filtered}
            loading={false}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelectedTicket(r)}
            emptyMessage="No support tickets"
          />
        </div>
      </div>

      {/* Create ticket modal */}
      <CreateTicketModal open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Ticket detail drawer */}
      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
}

function CreateTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<{
    subject: string;
    description: string;
    category: string;
    user_id: string;
  }>();
  const submit = handleSubmit(() => { toast.success('Ticket created'); onClose(); reset(); });
  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Create Support Ticket" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Create Ticket</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Input label="User ID" {...register('user_id')} placeholder="Optional — attach to a specific user" />
        <Select label="Category" options={[
          { value: 'booking', label: 'Booking Issue' },
          { value: 'payment', label: 'Payment Issue' },
          { value: 'driver', label: 'Driver Complaint' },
          { value: 'general', label: 'General Inquiry' },
          { value: 'complaint', label: 'Complaint' },
        ]} {...register('category')} />
        <Input label="Subject" required {...register('subject', { required: 'Required' })} />
        <Textarea label="Description" rows={4} required {...register('description', { required: 'Required' })} />
      </div>
    </Modal>
  );
}

function TicketDetailModal({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const toast = useToast();
  const { register, handleSubmit } = useForm<{ notes: string; status: string; assigned_to: string }>();
  const submit = handleSubmit(() => { toast.success('Ticket updated'); onClose(); });
  return (
    <Modal open onClose={onClose} title={`Ticket ${ticket.reference}`} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={submit}>Update Ticket</Button></>}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">{ticket.subject}</h4>
          <p className="text-sm text-gray-700">{ticket.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" options={[
            { value: 'open', label: 'Open' },
            { value: 'pending', label: 'Pending' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ]} defaultValue={ticket.status} {...register('status')} />
          <Input label="Assign To" defaultValue={ticket.assigned_to} {...register('assigned_to')} placeholder="Support agent name" />
        </div>
        <Textarea label="Internal Notes" rows={3} {...register('notes')} defaultValue={ticket.notes} placeholder="Add notes visible only to support staff…" />
      </div>
    </Modal>
  );
}
