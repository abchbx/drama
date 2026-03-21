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
  actorIds: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
