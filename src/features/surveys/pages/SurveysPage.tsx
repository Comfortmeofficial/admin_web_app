import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { surveysApi } from '../api/surveysApi';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';
import type { SurveyQuestion } from '@/types';

const TABS = [
  { key: 'questions', label: 'Questions' },
  { key: 'responses', label: 'Responses' },
];

export function SurveysPage() {
  const [tab, setTab] = useState('questions');
  return (
    <div className="flex flex-col h-full">
      <Header title="Trip Surveys" subtitle="Configure post-trip feedback and review passenger responses" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'questions' ? <QuestionManager /> : <ResponseViewer />}
      </div>
    </div>
  );
}

function QuestionManager() {
  const qc = useQueryClient();
  const toast = useToast();
  const [question, setQuestion] = useState('');
  const [questionType, setQuestionType] = useState<SurveyQuestion['question_type']>('text');
  const [optionsText, setOptionsText] = useState('');
  const [editing, setEditing] = useState<SurveyQuestion | null>(null);
  const { data: questions = [], isLoading } = useQuery({ queryKey: ['survey-questions'], queryFn: surveysApi.listQuestions });
  const saveMutation = useMutation({
    mutationFn: () => editing
      ? surveysApi.updateQuestion(editing.id, { question, question_type: questionType, options: optionsText.split('\n').map((item) => item.trim()).filter(Boolean), sort_order: editing.sort_order, is_active: editing.is_active })
      : surveysApi.createQuestion({ question, question_type: questionType, options: optionsText.split('\n').map((item) => item.trim()).filter(Boolean), sort_order: questions.length, is_active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['survey-questions'] }); setQuestion(''); setQuestionType('text'); setOptionsText(''); setEditing(null); toast.success('Survey question saved'); },
    onError: (error) => toast.error('Could not save question', getErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: surveysApi.deleteQuestion,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['survey-questions'] }); toast.success('Question deleted'); },
    onError: (error) => toast.error('Could not delete question', getErrorMessage(error)),
  });
  const startEdit = (item: SurveyQuestion) => { setEditing(item); setQuestion(item.question); setQuestionType(item.question_type); setOptionsText(item.options.join('\n')); };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3 mb-4"><ClipboardCheck className="w-5 h-5 text-primary-600" /><h2 className="font-semibold text-gray-900">Post-trip questions</h2></div>
        <div className="space-y-3">
          <Input className="flex-1" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. What could make your next trip more comfortable?" />
          <div className="flex gap-3 items-end">
            <Select label="Question type" value={questionType} onChange={(event) => setQuestionType(event.target.value as SurveyQuestion['question_type'])} options={[{ value: 'text', label: 'Text' }, { value: 'multiple_choice', label: 'Multiple choice' }, { value: 'rating', label: 'Rating (1–5)' }]} />
            {questionType === 'multiple_choice' && <Textarea label="Options (one per line)" value={optionsText} onChange={(event) => setOptionsText(event.target.value)} rows={3} placeholder={'Very comfortable\nComfortable\nNeeds improvement'} />}
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!question.trim() || (questionType === 'multiple_choice' && !optionsText.trim())}>{editing ? 'Save' : 'Add'}</Button>
            {editing && <Button variant="ghost" onClick={() => { setEditing(null); setQuestion(''); setQuestionType('text'); setOptionsText(''); }}>Cancel</Button>}
          </div>
        </div>
      </Card>
      <Card>
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-gray-500">Loading questions…</p>}
          {!isLoading && questions.length === 0 && <p className="text-sm text-gray-500">No questions configured. The survey stays hidden until you add one.</p>}
          {questions.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 border-b last:border-0 border-gray-100">
              <span className="text-sm text-gray-900 flex-1">{item.question}</span>
              <Badge variant="gray">{item.question_type === 'multiple_choice' ? 'Choice' : item.question_type === 'rating' ? 'Rating' : 'Text'}</Badge>
              <Badge variant={item.is_active ? 'success' : 'gray'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
              <button title="Edit question" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => startEdit(item)}><Pencil className="w-4 h-4" /></button>
              <button title="Delete question" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ResponseViewer() {
  const [rideId, setRideId] = useState('');
  const { data: questions = [] } = useQuery({ queryKey: ['survey-questions'], queryFn: surveysApi.listQuestions });
  const { data: responses = [], isLoading } = useQuery({ queryKey: ['survey-responses', rideId], queryFn: () => surveysApi.listResponses(rideId) });
  const questionLabels = new Map(questions.map((question) => [String(question.id), question.question]));
  return (
    <Card>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div><h2 className="font-semibold text-gray-900">Passenger responses</h2><p className="text-sm text-gray-500 mt-1">Filter by ride ID to review feedback for one trip.</p></div>
        <Input label="Ride ID" value={rideId} onChange={(event) => setRideId(event.target.value.replace(/\D/g, ''))} placeholder="All rides" className="w-36" />
      </div>
      {isLoading && <p className="text-sm text-gray-500">Loading responses…</p>}
      {!isLoading && responses.length === 0 && <p className="text-sm text-gray-500">No survey responses found.</p>}
      <div className="space-y-4">
        {responses.map((response) => (
          <div key={response.id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between gap-4 mb-3 text-sm"><span className="font-mono font-semibold">{response.booking_reference}</span><span className="text-gray-500">Ride {response.ride_id}</span></div>
            <div className="space-y-2">{Object.entries(response.answers).map(([questionId, answer]) => <div key={questionId} className="text-sm"><span className="text-gray-500">{questionLabels.get(questionId) ?? `Question ${questionId}`}: </span><span className="text-gray-900">{answer}</span></div>)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}