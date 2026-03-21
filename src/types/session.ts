/**
 * Session status lifecycle
 * - created: Session created but not yet initialized (actors/scenes not started)
 * - idle: Session initialized, ready for scenes
 * - running: A scene is currently active
 * - stopping: Scene stop requested, awaiting cleanup
 * - completed: All scenes finished successfully
 * - interrupted: Session stopped prematurely or error occurred
 * - failed: Session encountered unrecoverable error
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
 * Drama session stored in the registry
 */
export interface Session {
  dramaId: string;
  name: string;
  sceneDurationMinutes: number;
  agentCount: number;
  status: SessionStatus;
  activeSceneId: string | null;
  createdAt: Date;
  updatedAt: Date;
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
 * Input for updating a session
 */
export interface UpdateSessionInput {
  name?: string;
  sceneDurationMinutes?: number;
  agentCount?: number;
}

/**
 * Response for session list endpoint
 */
export interface SessionListResponse {
  sessions: Session[];
}
