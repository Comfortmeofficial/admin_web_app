import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Globe, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { termsClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Table, type Column } from '@/components/ui/Table';
import { Badge, statusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { formatDate, getErrorMessage, slugToLabel } from '@/lib/utils';
import type { TermsAndConditions, TermsDocType } from '@/types';

const DOC_TYPE_LABELS: Record<TermsDocType, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
};

export function ContentPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [publishTarget, setPublishTarget] = useState<TermsAndConditions | null>(null);
  const [viewContent, setViewContent] = useState<TermsAndConditions | null>(null);

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['terms'],
    queryFn: async () => {
      const { data } = await termsClient.get('/api/v1/terms/');
      return data as TermsAndConditions[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { content: string; version: string; title: string; doc_type: TermsDocType }) => {
      const { data } = await termsClient.post('/api/v1/terms/', payload);
      return data as TermsAndConditions;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['terms'] }); toast.success('Content created'); setShowCreate(false); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await termsClient.post(`/api/v1/terms/${id}/publish`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['terms'] }); toast.success('Content published'); setPublishTarget(null); },
    onError: (e) => toast.error('Failed', getErrorMessage(e)),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ content: string; version: string; title: string; doc_type: TermsDocType }>({
    defaultValues: { doc_type: 'terms' },
  });
  const submit = handleSubmit((data) => createMutation.mutate(data));

  const columns: Column<TermsAndConditions>[] = [
    { key: 'doc_type', header: 'Document', cell: (r) => <Badge variant="info">{DOC_TYPE_LABELS[r.doc_type] ?? r.doc_type}</Badge> },
    { key: 'version', header: 'Version', cell: (r) => <span className="font-mono font-semibold">v{r.version}</span> },
    { key: 'title', header: 'Title', cell: (r) => r.title ?? '—' },
    {
      key: 'status', header: 'Status',
      cell: (r) => <Badge variant={statusBadge(r.status)} dot>{slugToLabel(r.status)}</Badge>,
    },
    { key: 'published', header: 'Published', cell: (r) => r.published_at ? formatDate(r.published_at) : '—' },
    { key: 'created', header: 'Created', cell: (r) => formatDate(r.created_at) },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setViewContent(row)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Eye className="w-4 h-4" /></button>
          {row.status === 'draft' && (
            <button onClick={() => setPublishTarget(row)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500"><Globe className="w-4 h-4" /></button>
          )}
        </div>
      ),
      className: 'w-20',
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <Header title="Content Management" subtitle="Manage Terms & Conditions, Privacy Policy, and other content" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Terms & Conditions</h2>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>New Version</Button>
          </div>
          <Table columns={columns} data={terms} loading={isLoading} rowKey={(r) => r.id} emptyMessage="No content versions" />
        </div>
      </div>

      {/* Create version modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="Create New Version"
        size="2xl"
        footer={<><Button variant="outline" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button><Button onClick={submit} loading={createMutation.isPending}>Create</Button></>}
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Document"
            required
            options={[
              { value: 'terms', label: 'Terms & Conditions' },
              { value: 'privacy', label: 'Privacy Policy' },
            ]}
            {...register('doc_type', { required: true })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Version" required placeholder="1.0" {...register('version', { required: 'Required' })} error={errors.version?.message} />
            <Input label="Title" required placeholder="Terms & Conditions" {...register('title', { required: 'Required' })} error={errors.title?.message} />
          </div>
          <Textarea label="Content" required rows={12} {...register('content', { required: 'Required' })} error={errors.content?.message} placeholder="Enter the full content…" />
        </div>
      </Modal>

      {/* View content modal */}
      {viewContent && (
        <Modal open={!!viewContent} onClose={() => setViewContent(null)} title={`Terms v${viewContent.version}`} size="2xl">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {viewContent.content}
            </pre>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={() => publishTarget && publishMutation.mutate(publishTarget.id)}
        loading={publishMutation.isPending}
        confirmLabel="Publish"
        confirmVariant="primary"
        message={`Publish ${publishTarget ? DOC_TYPE_LABELS[publishTarget.doc_type] : 'this'} v${publishTarget?.version}? This replaces the currently active version of the same document — the other document is unaffected.`}
      />
    </div>
  );
}
