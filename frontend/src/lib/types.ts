export interface BackendSceneConfig {
  id: string;
  location: string;
  description: string;
  tone: string;
  actorIds: string[];
}

export interface BackendSceneResult {
  sceneId: string;
  status: 'completed' | 'interrupted' | 'timeout';
  entryCount: number;
  conflicts: string[];
  beats: string[];
}

export interface SessionMetadata {
  dramaId: string;
  name: string;
  status: 'created' | 'idle' | 'running' | 'stopping' | 'completed' | 'interrupted' | 'failed';
  sceneDurationMinutes: number;
  agentCount: number;
  activeSceneId: string | null;
  createdAt: string;
  updatedAt: string;
  lastResult: BackendSceneResult | null;
}

export interface CreateSessionInput {
  name: string;
  sceneDurationMinutes: number;
  agentCount: number;
}

export interface StartSceneInput {
  location: string;
  description: string;
  tone: string;
  actorIds?: string[];
}

export type LLMProvider = 'openai' | 'anthropic' | 'mock';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
}

export interface SessionParams {
  sceneDurationMinutes: number;
  agentCount: number;
  maxTokens?: number;
  maxTurns?: number;
  heartbeatInterval?: number;
  timeoutSeconds?: number;
}

export interface AppConfig {
  llmConfig: LLMConfig;
  sessionParams: SessionParams;
}

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  config: {
    agentCount: number;
    sceneDurationMinutes: number;
    maxTokens?: number;
    maxTurns?: number;
    heartbeatInterval?: number;
    timeoutSeconds?: number;
  };
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  technicalError?: string;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'connected' | 'disconnected' | 'idle' | 'active' | 'error';
  latency: number;
  lastHeartbeat?: string;
}

// Health types
export interface HealthData {
  api: {
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
  };
  socketIo: {
    status: 'connected' | 'disconnected' | 'error';
    clients: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  timestamp: string;
}

// Routing message types
export type MessageType = 'scene_start' | 'scene_end' | 'your_turn' | 'dialogue' | 'narration' | 'reaction' | 'heartbeat' | 'fallback' | 'actor_unavailable' | 'actor_reconnected';
export type ScenePhase = 'setup' | 'rising' | 'climax' | 'falling' | 'resolution';

export interface RoutingMessage {
  id: string;
  type: MessageType;
  from: string;
  to: string[];
  payload: Record<string, unknown>;
  scenePhase?: ScenePhase;
  cognitiveState?: {
    tokensUsed: number;
  };
  timestamp: number;
  sequenceNum?: number; // Optional sequence number from backend
  sequenceNum: number;
}

// Memory state types
export interface MemoryLayerState {
  tokensUsed: number;
  budget: number;
  content?: unknown;
}

export interface MemoryState {
  core: MemoryLayerState;
  scenario: MemoryLayerState;
  semantic: MemoryLayerState;
  procedural: MemoryLayerState;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'markdown' | 'pdf';

/**
 * Exported script data structure
 */
export interface ExportedScript {
  session: {
    dramaId: string;
    name: string;
    createdAt: string;
    sceneDurationMinutes: number;
    agentCount: number;
  };
  config: {
    sceneDurationMinutes: number;
    agentCount: number;
  };
  characters: Array<{
    agentId: string;
    characterCard: string;
  }>;
  backbone: Array<{
    id: string;
    timestamp: string;
    content: string;
  }>;
  scenes: Array<{
    sceneId: string;
    location: string;
    description: string;
    timestamp: string;
    beats: string[];
    conflicts: string[];
  }>;
}

/**
 * Export state in app store
 */
export interface ExportState {
  selectedSessionId: string | null;
  selectedFormat: ExportFormat;
  exporting: boolean;
  exportError: string | null;
}
