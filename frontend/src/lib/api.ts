import type {
  SessionMetadata,
  CreateSessionInput,
  StartSceneInput,
  ApiResponse,
  BackendSceneResult,
  AppConfig,
  LLMConfig,
  SessionParams,
  SessionTemplate,
} from './types.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function extractErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    return `HTTP ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

async function fetchWithErrorHandling<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText || response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: extractErrorMessage(err),
    };
  }
}

export class ApiClient {
  async createSession(input: CreateSessionInput): Promise<ApiResponse<{ dramaId: string; status: string }>> {
    return fetchWithErrorHandling('/session', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getSessions(): Promise<ApiResponse<SessionMetadata[]>> {
    return fetchWithErrorHandling('/sessions');
  }

  async getSession(dramaId: string): Promise<ApiResponse<SessionMetadata>> {
    return fetchWithErrorHandling(`/sessions/${dramaId}`);
  }

  async startScene(dramaId: string, sceneConfig: StartSceneInput): Promise<ApiResponse<BackendSceneResult>> {
    return fetchWithErrorHandling(`/sessions/${dramaId}/scene/start`, {
      method: 'POST',
      body: JSON.stringify(sceneConfig),
    });
  }

  async stopScene(dramaId: string): Promise<ApiResponse<{ success: boolean }>> {
    return fetchWithErrorHandling(`/sessions/${dramaId}/scene/stop`, {
      method: 'POST',
    });
  }

  async getConfig(): Promise<ApiResponse<AppConfig>> {
    return fetchWithErrorHandling('/config');
  }

  async updateConfig(config: Partial<AppConfig>): Promise<ApiResponse<AppConfig>> {
    return fetchWithErrorHandling('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async updateLLMConfig(llmConfig: Partial<LLMConfig>): Promise<ApiResponse<LLMConfig>> {
    return fetchWithErrorHandling('/config/llm', {
      method: 'PUT',
      body: JSON.stringify(llmConfig),
    });
  }

  async updateSessionParams(sessionParams: Partial<SessionParams>): Promise<ApiResponse<SessionParams>> {
    return fetchWithErrorHandling('/config/session', {
      method: 'PUT',
      body: JSON.stringify(sessionParams),
    });
  }

  async getTemplates(): Promise<ApiResponse<SessionTemplate[]>> {
    return fetchWithErrorHandling('/templates');
  }

  async getTemplate(id: string): Promise<ApiResponse<SessionTemplate>> {
    return fetchWithErrorHandling(`/templates/${id}`);
  }

  async createTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<SessionTemplate>> {
    return fetchWithErrorHandling('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(id: string, template: Partial<SessionTemplate>): Promise<ApiResponse<SessionTemplate>> {
    return fetchWithErrorHandling(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return fetchWithErrorHandling(`/templates/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
