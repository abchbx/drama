/**
 * Frontend types for session management - mirrors backend types
 */

export enum SessionStatus {
  CREATED = 'created',
  IDLE = 'idle',
  RUNNING = 'running',
  STOPPING = 'stopping',
  COMPLETED = 'completed',
  INTERRUPTED = 'interrupted',
  FAILED = 'failed',
}

/**
 * Drama session from the backend
 */
export interface Session {
  dramaId: string;
  name: string;
  sceneDurationMinutes: number;
  agentCount: number;
  status: SessionStatus;
  activeSceneId: string | null;
  createdAt: string;
  updatedAt: string;
  lastResult: {
    sceneId: string;
    status: 'completed' | 'interrupted' | 'timeout';
    entryCount: number;
    conflicts: string[];
    beats: string[];
  } | null;
}

/**
 * Input for creating a new session
 */
export interface CreateSessionInput {
  name: string;
  sceneDurationMinutes: number;
  agentCount: number;
}

/**
 * Response for scene start
 */
export interface SceneStartResponse {
  status: SessionStatus;
  sceneId: string;
}

/**
 * Response for scene stop
 */
export interface SceneStopResponse {
  status: SessionStatus.INTERRUPTED | SessionStatus.COMPLETED;
}

/**
 * Connection status for the socket
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
