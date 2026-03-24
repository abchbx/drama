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
  HealthData,
  SystemMetrics,
} from './types.js';

import { pdfExporter } from './pdfExporter.js';

// Detect CloudStudio environment and construct appropriate API URL
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl !== '/api') {
    return envUrl;
  }
  
  // In CloudStudio, we should use the relative path /api
  // CloudStudio's reverse proxy will handle forwarding to the backend
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    // If we're on a cloudstudio domain, use relative API path
    // The CloudStudio proxy will forward /api to the backend service
    if (host.includes('cloudstudio')) {
      return '/api';
    }
  }
  
  return '/api';
}

const API_BASE_URL = getApiBaseUrl();

function getUserFriendlyErrorMessage(status: number, errorText: string): string {
  switch (status) {
    case 400:
      return '请求参数错误';
    case 401:
      return '未授权,请重新登录';
    case 403:
      return '权限不足';
    case 404:
      return '资源不存在';
    case 409:
      return '资源冲突,请稍后重试';
    case 429:
      return '请求过于频繁,请稍后再试';
    case 500:
      return '服务器内部错误,请稍后重试';
    case 502:
    case 503:
    case 504:
      return '服务暂时不可用,请稍后重试';
    default:
      return `请求失败 (${status})`;
  }
}

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
  const url = `${API_BASE_URL}${endpoint}`;
  console.log('[API] Fetching:', options.method || 'GET', url);
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    console.log('[API] Response status:', response.status, url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[API] Error response:', errorText);
      const userFriendlyError = getUserFriendlyErrorMessage(response.status, errorText);
      const technicalError = `HTTP ${response.status}: ${errorText || response.statusText}`;

      return {
        success: false,
        error: userFriendlyError,
        technicalError, // Store technical error for debugging
      };
    }

    const data = await response.json();
    console.log('[API] Success response:', endpoint, JSON.stringify(data).substring(0, 200));
    return { success: true, data };
  } catch (err) {
    const errorMessage = extractErrorMessage(err);
    console.error('[API] Fetch error:', errorMessage);

    // Check for network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return {
        success: false,
        error: '网络连接失败,请检查网络设置',
        technicalError: errorMessage,
      };
    }

    return {
      success: false,
      error: '请求失败,请稍后重试',
      technicalError: errorMessage,
    };
  }
}

export class ApiClient {
  async createSession(input: CreateSessionInput): Promise<ApiResponse<{ dramaId: string; status: string }>> {
    return fetchWithErrorHandling('/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getSessions(): Promise<ApiResponse<SessionMetadata[]>> {
    return fetchWithErrorHandling('/sessions');
  }

  async getSession(dramaId: string): Promise<ApiResponse<SessionMetadata>> {
    const encodedId = encodeURIComponent(dramaId);
    return fetchWithErrorHandling(`/sessions/${encodedId}`);
  }

  async deleteSession(dramaId: string): Promise<ApiResponse<{ success: boolean }>> {
    const encodedId = encodeURIComponent(dramaId);
    return fetchWithErrorHandling(`/sessions/${encodedId}`, {
      method: 'DELETE',
    });
  }

  async startScene(dramaId: string, sceneConfig: StartSceneInput): Promise<ApiResponse<BackendSceneResult>> {
    const encodedId = encodeURIComponent(dramaId);
    return fetchWithErrorHandling(`/sessions/${encodedId}/scene/start`, {
      method: 'POST',
      body: JSON.stringify(sceneConfig),
    });
  }

  async stopScene(dramaId: string, status: 'completed' | 'interrupted' | 'timeout' = 'completed'): Promise<ApiResponse<{ success: boolean }>> {
    const encodedId = encodeURIComponent(dramaId);
    return fetchWithErrorHandling(`/sessions/${encodedId}/scene/stop`, {
      method: 'POST',
      body: JSON.stringify({ status }),
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

  async testLLMConfig(testConfig?: { provider: string; apiKey?: string; baseURL?: string; model?: string }): Promise<ApiResponse<{ success: boolean; provider: string; model?: string; latency: number; response?: string; error?: string }>> {
    console.log('[API] testLLMConfig called with config:', testConfig);
    const result = await fetchWithErrorHandling('/config/test', {
      method: 'POST',
      body: JSON.stringify({ testConfig }),
    });
    console.log('[API] testLLMConfig result:', result);
    return result;
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

  async getHealth(): Promise<ApiResponse<HealthData>> {
    return fetchWithErrorHandling('/health');
  }

  async getSystemMetrics(): Promise<ApiResponse<SystemMetrics[]>> {
    return fetchWithErrorHandling('/metrics');
  }

  async getAgents(): Promise<ApiResponse<{ agents: Array<{ agentId: string; role: string; socketId: string; connectedAt: number; lastPong: number }> }>> {
    return fetchWithErrorHandling('/sessions/agents');
  }

  async sendTestMessage(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return fetchWithErrorHandling('/sessions/test-message', {
      method: 'POST',
    });
  }

  /**
   * Export session data as text (JSON or Markdown)
   */
  async exportSession(
    dramaId: string,
    format: 'json' | 'markdown'
  ): Promise<ApiResponse<string>> {
    const encodedId = encodeURIComponent(dramaId);
    return fetchWithErrorHandling<string>(
      `/sessions/${encodedId}/export?format=${format}`
    );
  }

  /**
   * Download exported file to browser
   * Uses Blob + anchor click pattern (from templateStorage.ts)
   */
  downloadExportedFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export script as PDF using html2pdf.js
   * Fetches Markdown from backend, converts to PDF, downloads
   */
  async exportSessionAsPDF(dramaId: string, sessionName: string): Promise<void> {
    // First fetch Markdown from backend
    const result = await this.exportSession(dramaId, 'markdown');

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch script for PDF export');
    }

    // Convert Markdown to PDF and download
    const filename = `${sessionName.toLowerCase().replace(/\s+/g, '-')}-script.pdf`;
    await pdfExporter.exportMarkdownAsPDF(result.data, filename);
  }
}

export const apiClient = new ApiClient();
