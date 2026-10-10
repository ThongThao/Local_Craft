import { apiClient, ApiResponse } from './client';

export interface ChatbotQueryResponse {
  session_id: number;
  message: string;
  sources?: string[];
}

export const chatbotApi = {
  query: async (message: string, sessionId?: number | null): Promise<ApiResponse<ChatbotQueryResponse>> => {
    return apiClient('/chatbot/query/', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId || null }),
      requiresAuth: false,
    });
  },
};
