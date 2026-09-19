import { adminClient } from '@/lib/api';
import type { SurveyQuestion, SurveyResponse } from '@/types';

export const surveysApi = {
  listQuestions: async () => {
    const { data } = await adminClient.get('/api/v1/surveys/questions', { params: { include_inactive: true } });
    return data as SurveyQuestion[];
  },
  createQuestion: async (payload: Pick<SurveyQuestion, 'question' | 'question_type' | 'options' | 'sort_order' | 'is_active'>) => {
    const { data } = await adminClient.post('/api/v1/surveys/questions', payload);
    return data as SurveyQuestion;
  },
  updateQuestion: async (id: number, payload: Pick<SurveyQuestion, 'question' | 'question_type' | 'options' | 'sort_order' | 'is_active'>) => {
    const { data } = await adminClient.put(`/api/v1/surveys/questions/${id}`, payload);
    return data as SurveyQuestion;
  },
  deleteQuestion: async (id: number) => {
    await adminClient.delete(`/api/v1/surveys/questions/${id}`);
  },
  listResponses: async (rideId?: string) => {
    const { data } = await adminClient.get('/api/v1/surveys/responses', { params: rideId ? { ride_id: rideId } : undefined });
    return data as SurveyResponse[];
  },
};