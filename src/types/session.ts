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
 * Export format options
 */
export enum ExportFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
}

/**
 * Exported script structure for JSON format
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
 * Response for session list endpoint
 */
export interface SessionListResponse {
  sessions: Session[];
}
