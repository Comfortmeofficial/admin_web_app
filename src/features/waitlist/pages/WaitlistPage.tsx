import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { waitlistApi } from '../api/waitlistApi';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { StatsCard } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime, exportToCsv, getErrorMessage } from '@/lib/utils';
import { PAGE_SIZE } from '@/lib/constants';
import { Download, UserPlus, Plus, Pencil, Trash2 } from 'lucide-react';
import type { WaitlistEntry, WaitlistEntryPayload } from '@/types';

export function WaitlistPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<WaitlistEntry | null>(null);
  const [deleteItem, setDeleteItem] = useState<WaitlistEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['waitlist', page],
    queryFn: () => waitlistApi.list({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: waitlistApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Added to waitlist');
      setShowCreate(false);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WaitlistEntryPayload }) => waitlistApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Entry updated');
      setEditing(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: waitlistApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Entry removed');
      setDeleteItem(null);
    },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const filtered = entries.filter((e) =>
    `${e.full_name} ${e.email} ${e.city ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<WaitlistEntry>[] = [
    { key: 'full_name', header: 'Name', cell: (r) => <span className="font-medium text-gray-900">{r.full_name}</span> },
    { key: 'email', header: 'Email', cell: (r) => r.email },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone ?? '—' },
    { key: 'city', header: 'City', cell: (r) => r.city ?? '—' },
    { key: 'occupation', header: 'Occupation', cell: (r) => r.occupation ?? '—' },
    { key: 'commute_days', header: 'Commute Days', cell: (r) => r.commute_days ?? '—' },
    { key: 'preference', header: 'Preference', cell: (r) => r.preference ?? '—' },
    { key: 'joined', header: 'Joined', cell: (r) => formatDateTime(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(row); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteItem(row); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      className: 'w-20',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Waitlist" subtitle="Everyone who's signed up ahead of launch via the landing page" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard label="On This Page" value={entries.length} icon={<UserPlus className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-100" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Waitlist Signups</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, city…" className="w-56" />
              <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(entries, 'waitlist')}>Export</Button>
              <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>Add to Waitlist</Button>
            </div>
          </div>

          <Table columns={columns} data={filtered} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No one has joined the waitlist yet" />

          <div className="px-5 py-4 border-t border-gray-100">
            <Pagination page={page} pageSize={PAGE_SIZE} total={entries.length >= PAGE_SIZE ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + entries.length} onChange={setPage} />
          </div>
        </div>
      </div>

      <WaitlistForm
        open={showCreate || !!editing}
        onClose={() => { setShowCreate(false); setEditing(null); }}
        onSubmit={(p) => editing ? updateMutation.mutate({ id: editing.id, payload: p }) : createMutation.mutate(p)}
        loading={createMutation.isPending || updateMutation.isPending}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        loading={deleteMutation.isPending}
        message={`Remove "${deleteItem?.full_name}" (${deleteItem?.email}) from the waitlist?`}
      />
    </div>
  );
}

interface WaitlistFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: WaitlistEntryPayload) => void;
  loading?: boolean;
  editing: WaitlistEntry | null;
}

function WaitlistForm({ open, onClose, onSubmit, loading, editing }: WaitlistFormProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WaitlistEntryPayload>();

  useEffect(() => {
    if (!editing) {
      reset({});
      return;
    }
    reset({
      full_name: editing.full_name,
      email: editing.email,
      phone: editing.phone ?? undefined,
      city: editing.city ?? undefined,
      occupation: editing.occupation ?? undefined,
      commute_days: editing.commute_days ?? undefined,
      challenge: editing.challenge ?? undefined,
      preference: editing.preference ?? undefined,
    });
  }, [editing, reset]);

  const submit = handleSubmit((data) => onSubmit(data));
  const handleClose = () => { onClose(); reset({}); };

  return (
    <Modal open={open} onClose={handleClose} title={editing ? 'Edit Waitlist Entry' : 'Add to Waitlist'} size="md"
      footer={<><Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>{editing ? 'Save Changes' : 'Add'}</Button></>}
    >
      <div className="grid grid-cols-1 gap-4">
        <Input label="Full Name" required {...register('full_name', { required: 'Required' })} error={errors.full_name?.message} />
        <Input label="Email" type="email" required {...register('email', { required: 'Required' })} error={errors.email?.message} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" {...register('phone')} />
          <Input label="City" {...register('city')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Occupation" {...register('occupation')} />
          <Input label="Commute Days" {...register('commute_days')} placeholder="e.g. Mon-Fri" />
        </div>
        <Input label="Preference" {...register('preference')} />
        <Input label="Challenge" {...register('challenge')} hint="What commuting challenge are they hoping to solve?" />
      </div>
    </Modal>
  );
}
