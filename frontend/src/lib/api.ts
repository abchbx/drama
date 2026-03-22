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

  async getHealth(): Promise<ApiResponse<HealthData>> {
    return fetchWithErrorHandling('/health');
  }

  async getSystemMetrics(): Promise<ApiResponse<SystemMetrics[]>> {
    return fetchWithErrorHandling('/metrics');
  }

  /**
   * Export session data as text (JSON or Markdown)
   */
  async exportSession(
    dramaId: string,
    format: 'json' | 'markdown'
  ): Promise<ApiResponse<string>> {
    return fetchWithErrorHandling<string>(
      `/sessions/${dramaId}/export?format=${format}`
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
