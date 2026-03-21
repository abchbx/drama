import { create } from 'zustand';
import type { SessionMetadata } from '../lib/types.js';
import { apiClient } from '../lib/api.js';
import { socketService } from '../lib/socket.js';
import { toastService } from '../lib/toast.js';

interface AppState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  lastError: string | null;
  sessions: SessionMetadata[];
  selectedSession: SessionMetadata | null;
  creatingSession: boolean;
  startingScene: boolean;
  stoppingScene: boolean;
  setConnectionStatus: (status: AppState['connectionStatus'], error?: string | null) => void;
  fetchSessions: () => Promise<void>;
  selectSession: (session: SessionMetadata | null) => void;
  createSession: (name: string, sceneDurationMinutes: number, agentCount: number) => Promise<void>;
  startScene: (location: string, description: string, tone: string, actorIds: string[]) => Promise<void>;
  stopScene: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  connectionStatus: socketService.getStatus(),
  lastError: null,
  sessions: [],
  selectedSession: null,
  creatingSession: false,
  startingScene: false,
  stoppingScene: false,

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
