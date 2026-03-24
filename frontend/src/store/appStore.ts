import { create } from 'zustand';
import type { SessionMetadata, AppConfig, LLMConfig, SessionParams, SessionTemplate, Agent, RoutingMessage } from '../lib/types.js';
import { apiClient } from '../lib/api.js';
import { socketService } from '../lib/socket.js';
import { toastService } from '../lib/toast.js';
import {
  getLocalTemplates,
  saveLocalTemplate,
  deleteLocalTemplate,
  updateLastUsed,
} from '../utils/templateStorage.js';

type TabType = 'sessions' | 'llm-config' | 'session-params' | 'dashboard' | 'templates' | 'visualization' | 'export';

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
  selectedExportSessionId: string | null;
  selectedExportFormat: 'json' | 'markdown' | 'pdf';
  exporting: boolean;
  exportError: string | null;
  // Persistent state for Dashboard and Visualization
  agents: Agent[];
  messages: RoutingMessage[];
  setConnectionStatus: (status: AppState['connectionStatus'], error?: string | null) => void;
  fetchSessions: () => Promise<void>;
  selectSession: (session: SessionMetadata | null) => void;
  createSession: (name: string, sceneDurationMinutes: number, agentCount: number) => Promise<void>;
  deleteSession: (dramaId: string) => Promise<void>;
  startScene: (location: string, description: string, tone: string, actorIds?: string[]) => Promise<void>;
  stopScene: (status?: 'completed' | 'interrupted' | 'timeout') => Promise<void>;
  setActiveTab: (tab: TabType) => void;
  fetchConfig: () => Promise<void>;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateLLMConfig: (llmConfig: Partial<LLMConfig>) => Promise<void>;
  updateSessionParams: (sessionParams: Partial<SessionParams>) => Promise<void>;
  testLLMConfig: (testConfig?: { provider: string; apiKey?: string; baseURL?: string; model?: string }) => Promise<{ success: boolean; provider: string; model?: string; latency: number; response?: string; error?: string }>;
  fetchTemplates: () => void;
  selectTemplate: (template: SessionTemplate | null) => void;
  saveTemplate: (template: Omit<SessionTemplate, 'createdAt' | 'updatedAt'>) => void;
  deleteTemplate: (id: string) => void;
  useTemplate: (template: SessionTemplate) => Promise<void>;
  setSelectedExportSessionId: (id: string | null) => void;
  setSelectedExportFormat: (format: 'json' | 'markdown' | 'pdf') => void;
  exportScript: () => Promise<void>;
  clearExportError: () => void;
  // Dashboard actions
  setAgents: (agents: Agent[]) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  fetchAgents: () => Promise<void>;
  // Visualization actions
  addMessage: (message: RoutingMessage) => void;
  setMessages: (messages: RoutingMessage[]) => void;
  clearMessages: () => void;
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
  connectionStatus: 'connecting',
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
  selectedExportSessionId: null,
  selectedExportFormat: 'json',
  exporting: false,
  exportError: null,
  agents: [],
  messages: [],
  setActiveTab: (tab: TabType) => set({ activeTab: tab }),

  setConnectionStatus: (status, error = null) => {
    console.log('[AppStore] Setting connection status:', status, error);
    set({ connectionStatus: status, lastError: error });
  },

  fetchSessions: async () => {
    console.log('[fetchSessions] Fetching sessions from backend...');
    const response = await apiClient.getSessions();
    console.log('[fetchSessions] API response success:', response.success);
    console.log('[fetchSessions] Raw response data type:', typeof response.data, 'isArray:', Array.isArray(response.data));
    
    if (response.success && response.data) {
      // 后端返回 { sessions: [...] }，需要提取数组
      let sessions;
      if (Array.isArray(response.data)) {
        sessions = response.data;
      } else if (response.data && typeof response.data === 'object') {
        sessions = (response.data as any).sessions || [];
      } else {
        sessions = [];
      }
      
      console.log('[fetchSessions] Parsed sessions count:', sessions.length);
      sessions.forEach((s: any, i: number) => {
        console.log(`[fetchSessions] Session ${i}: name="${s.name}", dramaId="${s.dramaId}"`);
      });
      
      // 同步更新 selectedSession，保持选中状态的数据最新
      const { selectedSession } = get();
      if (selectedSession) {
        const updatedSelected = sessions.find((s: SessionMetadata) => s.dramaId === selectedSession.dramaId);
        if (updatedSelected) {
          console.log('[fetchSessions] Updating selected session data');
          set({ sessions, selectedSession: updatedSelected });
          return;
        }
      }
      console.log('[fetchSessions] Setting sessions:', sessions.length);
      set({ sessions });
    } else {
      console.error('[fetchSessions] Failed to fetch sessions:', response.error);
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

  deleteSession: async (dramaId: string) => {
    set({ lastError: null });

    console.log('[deleteSession] Starting delete for dramaId:', dramaId);
    const response = await apiClient.deleteSession(dramaId);
    console.log('[deleteSession] API response:', response);

    // If session not found on backend, treat as success (already deleted)
    if (!response.success && response.technicalError?.includes('404')) {
      console.log('[deleteSession] Session already deleted on backend');
    } else if (!response.success) {
      const errorMsg = response.error || 'Failed to delete session';
      console.error('[deleteSession] Delete failed:', errorMsg);
      set({ lastError: errorMsg });
      toastService.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[deleteSession] Delete API call successful');

    // If the deleted session was selected, clear it
    const { selectedSession } = get();
    if (selectedSession?.dramaId === dramaId) {
      console.log('[deleteSession] Clearing selected session');
      set({ selectedSession: null });
    }

    // Optimistically remove the session from local state first for immediate UI feedback
    const currentSessions = get().sessions;
    console.log('[deleteSession] Current sessions count before filter:', currentSessions.length);
    console.log('[deleteSession] Filtering out dramaId:', dramaId);
    console.log('[deleteSession] Current session IDs:', currentSessions.map(s => s.dramaId));
    
    const updatedSessions = currentSessions.filter(s => {
      const match = s.dramaId === dramaId;
      console.log(`[deleteSession] Comparing s.dramaId="${s.dramaId}" with dramaId="${dramaId}", match=${match}`);
      return !match;
    });
    
    console.log('[deleteSession] Updated sessions count after filter:', updatedSessions.length);
    
    // Force immediate state update before fetch
    set({ sessions: updatedSessions });
    console.log('[deleteSession] State updated optimistically');

    // Then refresh from backend to ensure sync (but don't let it override our optimistic update if it fails)
    console.log('[deleteSession] Fetching fresh sessions from backend...');
    
    try {
      await get().fetchSessions();
      const finalSessions = get().sessions;
      console.log('[deleteSession] Final sessions count after fetch:', finalSessions.length);
      
      // Verify the deleted session is actually gone
      const stillExists = finalSessions.some(s => s.dramaId === dramaId);
      if (stillExists) {
        console.error('[deleteSession] WARNING: Session still exists after fetch!');
        // Force remove it again
        set({ sessions: finalSessions.filter(s => s.dramaId !== dramaId) });
      }
    } catch (fetchError) {
      console.error('[deleteSession] fetchSessions failed:', fetchError);
      // Keep the optimistic update since fetch failed
    }
    
    toastService.show('Session deleted', 'success');
  },

  startScene: async (location, description, tone, actorIds) => {
    const { selectedSession } = get();

    if (!selectedSession) {
      set({ lastError: 'No session selected' });
      return;
    }

    set({ startingScene: true, lastError: null });

    // Build scene config - only include actorIds if provided
    const sceneConfig: { location: string; description: string; tone: string; actorIds?: string[] } = {
      location,
      description,
      tone,
    };
    if (actorIds && actorIds.length > 0) {
      sceneConfig.actorIds = actorIds;
    }

    const response = await apiClient.startScene(selectedSession.dramaId, sceneConfig);

    set({ startingScene: false });

    if (!response.success) {
      set({ lastError: response.error || 'Failed to start scene' });
      return;
    }

    await get().fetchSessions();
  },

  stopScene: async (status: 'completed' | 'interrupted' | 'timeout' = 'completed') => {
    const { selectedSession } = get();

    if (!selectedSession) {
      set({ lastError: 'No session selected' });
      return;
    }

    set({ stoppingScene: true, lastError: null });

    const response = await apiClient.stopScene(selectedSession.dramaId, status);

    set({ stoppingScene: false });

    if (!response.success) {
      // Check if scene already completed (race condition)
      if (response.technicalError?.includes('not running')) {
        toastService.show('Scene already completed', 'info');
        // Refresh sessions to get the latest state
        await get().fetchSessions();
      } else {
        set({ lastError: response.error || 'Failed to stop scene' });
      }
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

  testLLMConfig: async (testConfig?: { provider: string; apiKey?: string; baseURL?: string; model?: string }) => {
    console.log('[AppStore] testLLMConfig called with config:', testConfig);
    const response = await apiClient.testLLMConfig(testConfig);
    console.log('[AppStore] testLLMConfig response:', response);
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.error || 'Test failed');
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

  setSelectedExportSessionId: (id) => set({ selectedExportSessionId: id }),
  setSelectedExportFormat: (format) => set({ selectedExportFormat: format }),

  exportScript: async () => {
    const state = useAppStore.getState();
    const { selectedExportSessionId, selectedExportFormat, sessions } = state;

    if (!selectedExportSessionId) {
      set({ exportError: 'Please select a session to export' });
      return;
    }

    set({ exporting: true, exportError: null });

    try {
      const session = sessions.find(s => s.dramaId === selectedExportSessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const filename = `${session.name.toLowerCase().replace(/\s+/g, '-')}-script.${selectedExportFormat}`;

      if (selectedExportFormat === 'pdf') {
        // PDF export: fetch Markdown, convert to PDF
        await apiClient.exportSessionAsPDF(selectedExportSessionId, session.name);
      } else {
        // JSON or Markdown: download directly from backend
        const result = await apiClient.exportSession(selectedExportSessionId, selectedExportFormat);

        if (result.success && result.data) {
          const mimeType = selectedExportFormat === 'json' ? 'application/json' : 'text/markdown';
          apiClient.downloadExportedFile(result.data, filename, mimeType);
        } else {
          throw new Error(result.error || 'Export failed');
        }
      }

      toastService.success('Script exported successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      set({ exportError: errorMessage });
      toastService.error('Export failed: ' + errorMessage);
    } finally {
      set({ exporting: false });
    }
  },

  clearExportError: () => set({ exportError: null }),

  // Dashboard actions
  setAgents: (agents: Agent[]) => set({ agents }),
  updateAgent: (agent: Agent) => set((state) => {
    const existing = state.agents.find(a => a.id === agent.id);
    if (existing) {
      return { agents: state.agents.map(a => a.id === agent.id ? { ...a, ...agent } : a) };
    }
    return { agents: [...state.agents, agent] };
  }),
  removeAgent: (id: string) => set((state) => ({
    agents: state.agents.map(a => a.id === id ? { ...a, status: 'disconnected' as const } : a)
  })),
  fetchAgents: async () => {
    const response = await apiClient.getAgents();
    if (response.success && response.data) {
      const fetchedAgents = response.data.agents || [];
      console.log('[AppStore] fetchAgents received:', fetchedAgents.length, 'agents');
      
      // Only update if we got data, otherwise keep existing
      if (fetchedAgents.length > 0) {
        const mapped: Agent[] = fetchedAgents.map((a: any) => {
          let name: string;
          if (a.agentId.startsWith('director-')) {
            name = 'Director';
          } else if (a.agentId.startsWith('actor-')) {
            const match = a.agentId.match(/-(\d+)$/);
            const num = match ? match[1] : '';
            name = `Actor ${num}`;
          } else {
            name = a.agentId.substring(0, 8);
          }
          return {
            id: a.agentId,
            name,
            role: a.role,
            status: 'connected' as const,
            latency: 0,
            lastHeartbeat: new Date(a.lastPong).toISOString(),
          };
        });
        set({ agents: mapped });
      } else {
        console.log('[AppStore] fetchAgents: no agents from server, keeping existing');
      }
    }
  },

  // Visualization actions
  addMessage: (message: RoutingMessage) => {
    console.log('[AppStore] Adding message:', {
      type: message?.type,
      from: message?.from,
      hasPayload: !!message?.payload,
      payloadKeys: message?.payload ? Object.keys(message.payload) : []
    });
    set((state) => {
      const newMessages = [...state.messages, message];
      console.log('[AppStore] Message count:', newMessages.length);
      return { messages: newMessages };
    });
  },
  setMessages: (messages: RoutingMessage[]) => set({ messages }),
  clearMessages: () => set({ messages: [] }),
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
