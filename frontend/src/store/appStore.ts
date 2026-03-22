import { create } from 'zustand';
import type { SessionMetadata, AppConfig, LLMConfig, SessionParams, SessionTemplate } from '../lib/types.js';
import { apiClient } from '../lib/api.js';
import { socketService } from '../lib/socket.js';
import { toastService } from '../lib/toast.js';
import {
  getLocalTemplates,
  saveLocalTemplate,
  deleteLocalTemplate,
  updateLastUsed,
} from '../utils/templateStorage.js';

type TabType = 'sessions' | 'llm-config' | 'session-params' | 'dashboard' | 'templates' | 'visualization';

interface AppState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  lastError: string | null;
  sessions: SessionMetadata[];
  selectedSession: SessionMetadata | null;
  creatingSession: boolean;
  startingScene: boolean;
  stoppingScene: boolean;
  activeTab: TabType;
  config: AppConfig;
  loadingConfig: boolean;
  updatingConfig: boolean;
  templates: SessionTemplate[];
  selectedTemplate: SessionTemplate | null;
  loadingTemplates: boolean;
  savingTemplate: boolean;
  setConnectionStatus: (status: AppState['connectionStatus'], error?: string | null) => void;
  fetchSessions: () => Promise<void>;
  selectSession: (session: SessionMetadata | null) => void;
  createSession: (name: string, sceneDurationMinutes: number, agentCount: number) => Promise<void>;
  startScene: (location: string, description: string, tone: string, actorIds: string[]) => Promise<void>;
  stopScene: () => Promise<void>;
  setActiveTab: (tab: TabType) => void;
  fetchConfig: () => Promise<void>;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateLLMConfig: (llmConfig: Partial<LLMConfig>) => Promise<void>;
  updateSessionParams: (sessionParams: Partial<SessionParams>) => Promise<void>;
  fetchTemplates: () => void;
  selectTemplate: (template: SessionTemplate | null) => void;
  saveTemplate: (template: Omit<SessionTemplate, 'createdAt' | 'updatedAt'>) => void;
  deleteTemplate: (id: string) => void;
  useTemplate: (template: SessionTemplate) => Promise<void>;
}

const defaultConfig: AppConfig = {
  llmConfig: {
    provider: 'mock',
    model: 'gpt-4',
    temperature: 0.7,
  },
  sessionParams: {
    sceneDurationMinutes: 5,
    agentCount: 3,
    maxTokens: 2000,
    maxTurns: 10,
    heartbeatInterval: 30,
    timeoutSeconds: 120,
  },
};

export const useAppStore = create<AppState>((set, get) => ({
  connectionStatus: socketService.getStatus(),
  lastError: null,
  sessions: [],
  selectedSession: null,
  creatingSession: false,
  startingScene: false,
  stoppingScene: false,
  activeTab: 'sessions',
  config: defaultConfig,
  loadingConfig: false,
  updatingConfig: false,
  templates: [],
  selectedTemplate: null,
  loadingTemplates: false,
  savingTemplate: false,
  setActiveTab: (tab: TabType) => set({ activeTab: tab }),

  setConnectionStatus: (status, error = null) => {
    set({ connectionStatus: status, lastError: error });
  },

  fetchSessions: async () => {
    const response = await apiClient.getSessions();
    if (response.success && response.data) {
      set({ sessions: response.data });
    }
  },

  selectSession: (session) => {
    set({ selectedSession: session });
  },

  createSession: async (name, sceneDurationMinutes, agentCount) => {
    set({ creatingSession: true, lastError: null });

    const response = await apiClient.createSession({ name, sceneDurationMinutes, agentCount });

    set({ creatingSession: false });

    if (!response.success) {
      set({ lastError: response.error || 'Failed to create session' });
      return;
    }

    await get().fetchSessions();
  },

  startScene: async (location, description, tone, actorIds) => {
    const { selectedSession, connectionStatus } = get();

    if (!selectedSession || connectionStatus !== 'connected') {
      set({ lastError: 'No session selected or not connected' });
      return;
    }

    set({ startingScene: true, lastError: null });

    const response = await apiClient.startScene(selectedSession.dramaId, {
      location,
      description,
      tone,
      actorIds,
    });

    set({ startingScene: false });

    if (!response.success) {
      set({ lastError: response.error || 'Failed to start scene' });
      return;
    }

    await get().fetchSessions();
  },

  stopScene: async () => {
    const { selectedSession, connectionStatus } = get();

    if (!selectedSession || connectionStatus !== 'connected') {
      set({ lastError: 'No session selected or not connected' });
      return;
    }

    set({ stoppingScene: true, lastError: null });

    const response = await apiClient.stopScene(selectedSession.dramaId);

    set({ stoppingScene: false });

    if (!response.success) {
      set({ lastError: response.error || 'Failed to stop scene' });
      return;
    }

    await get().fetchSessions();
  },

  fetchConfig: async () => {
    set({ loadingConfig: true, lastError: null });
    const response = await apiClient.getConfig();
    set({ loadingConfig: false });

    if (response.success && response.data) {
      set({ config: response.data });
    } else {
      // Use default config if backend doesn't have it
      set({ lastError: response.error || 'Failed to load config, using defaults' });
    }
  },

  updateConfig: async (config: Partial<AppConfig>) => {
    set({ updatingConfig: true, lastError: null });
    const response = await apiClient.updateConfig(config);
    set({ updatingConfig: false });

    if (response.success && response.data) {
      set({ config: response.data });
      toastService.show('Configuration updated', 'success');
    } else {
      set({ lastError: response.error || 'Failed to update config' });
    }
  },

  updateLLMConfig: async (llmConfig: Partial<LLMConfig>) => {
    set({ updatingConfig: true, lastError: null });
    const response = await apiClient.updateLLMConfig(llmConfig);
    set({ updatingConfig: false });

    if (response.success && response.data) {
      set(state => ({
        config: {
          ...state.config,
          llmConfig: response.data as LLMConfig
        },
      }));
      toastService.show('LLM configuration updated', 'success');
    } else {
      set({ lastError: response.error || 'Failed to update LLM config' });
    }
  },

  updateSessionParams: async (sessionParams: Partial<SessionParams>) => {
    set({ updatingConfig: true, lastError: null });
    const response = await apiClient.updateSessionParams(sessionParams);
    set({ updatingConfig: false });

    if (response.success && response.data) {
      set(state => ({
        config: {
          ...state.config,
          sessionParams: response.data as SessionParams
        },
      }));
      toastService.show('Session parameters updated', 'success');
    } else {
      set({ lastError: response.error || 'Failed to update session params' });
    }
  },

  fetchTemplates: () => {
    set({ loadingTemplates: true });
    const templates = getLocalTemplates();
    set({ templates, loadingTemplates: false });
  },

  selectTemplate: (template) => {
    set({ selectedTemplate: template });
  },

  saveTemplate: (template) => {
    set({ savingTemplate: true });
    const savedTemplate = saveLocalTemplate(template);
    const templates = getLocalTemplates();
    set({ templates, selectedTemplate: savedTemplate, savingTemplate: false });
    toastService.show(template.id ? 'Template updated' : 'Template created', 'success');
  },

  deleteTemplate: (id) => {
    deleteLocalTemplate(id);
    const templates = getLocalTemplates();
    set({ templates, selectedTemplate: null });
    toastService.show('Template deleted', 'success');
  },

  useTemplate: async (template) => {
    updateLastUsed(template.id);
    const { fetchTemplates, createSession, setActiveTab } = get();
    fetchTemplates();

    // Create session from template
    const sessionName = `${template.name} Session`;
    await createSession(
      sessionName,
      template.config.sceneDurationMinutes,
      template.config.agentCount
    );

    setActiveTab('sessions');
    toastService.show('Session created from template', 'success');
  },
}));

// Track previous connection status to detect transitions
let previousConnectionStatus: AppState['connectionStatus'] = 'disconnected';

// Wire socket connection status changes to UI state and toast notifications
socketService.onConnectionStatusChange((status, error) => {
  const store = useAppStore.getState();
  store.setConnectionStatus(status, error ?? null);

  // Show toast on connection state transitions
  if (status === 'disconnected' && previousConnectionStatus !== 'disconnected') {
    toastService.show('Connection lost - reconnecting...', 'warning');
  } else if (status === 'connected' && previousConnectionStatus !== 'connected') {
    toastService.show('Connection restored', 'success');
    // On reconnect, refetch sessions to reconcile state
    store.fetchSessions();
  } else if (status === 'reconnecting' && previousConnectionStatus !== 'reconnecting') {
    toastService.show('Connection lost - reconnecting...', 'warning');
  }

  previousConnectionStatus = status;
});

// Wire socket events for scene state updates
// Note: These events are sent from backend when scene state changes
socketService.on('scene_started', () => {
  toastService.show('Scene started', 'success');
  useAppStore.getState().fetchSessions();
});

socketService.on('scene_stopped', () => {
  toastService.show('Scene stopped', 'info');
  useAppStore.getState().fetchSessions();
});

socketService.on('scene_completed', () => {
  toastService.show('Scene completed', 'success');
  useAppStore.getState().fetchSessions();
});

// Listen for session_state events (full session state sync)
socketService.on('session_state', (data: unknown) => {
  const state = data as { status?: string };
  if (state.status === 'running') {
    toastService.show('Scene running', 'info');
  }
  useAppStore.getState().fetchSessions();
});
