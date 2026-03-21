import { Session, SessionStatus } from '../types/session.js';

/**
 * Custom error for session not found scenarios
 */
export class SessionNotFoundError extends Error {
  constructor(dramaId: string) {
    super(`Session not found: ${dramaId}`);
    this.name = 'SessionNotFoundError';
  }
}

/**
 * Custom error for invalid status transitions
 */
export class InvalidStatusTransitionError extends Error {
  constructor(from: SessionStatus, to: SessionStatus) {
    super(`Invalid status transition: cannot transition from ${from} to ${to}`);
    this.name = 'InvalidStatusTransitionError';
  }
}

/**
 * Custom error for attempting invalid operation on session
 */
export class SessionOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionOperationError';
  }
}

/**
 * In-memory session registry with CRUD operations and scene control
 */
export class SessionRegistry {
  private sessions: Map<string, Session>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * Create a new session
   */
  create(input: {
    name: string;
    sceneDurationMinutes: number;
    agentCount: number;
  }): Session {
    const now = new Date();
    const session: Session = {
      dramaId: crypto.randomUUID(),
      name: input.name,
      sceneDurationMinutes: input.sceneDurationMinutes,
      agentCount: input.agentCount,
      status: SessionStatus.CREATED,
      activeSceneId: null,
      createdAt: now,
      updatedAt: now,
      lastResult: null,
    };

    this.sessions.set(session.dramaId, session);
    return session;
  }

  /**
   * Get session by dramaId
   */
  get(dramaId: string): Session {
    const session = this.sessions.get(dramaId);
    if (!session) {
      throw new SessionNotFoundError(dramaId);
    }
    return session;
  }

  /**
   * List all sessions
   */
  list(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Start a scene on a session
   */
  startScene(dramaId: string, sceneId: string): Session {
    const session = this.get(dramaId);

    // Must be CREATED or IDLE to start
    if (session.status !== SessionStatus.CREATED && session.status !== SessionStatus.IDLE) {
      if (session.status === SessionStatus.RUNNING) {
        throw new SessionOperationError('Cannot start scene: session is already running');
      }
      throw new SessionOperationError(
        `Cannot start scene: session must be in created or idle state (current: ${session.status})`
      );
    }

    session.status = SessionStatus.RUNNING;
    session.activeSceneId = sceneId;
    session.updatedAt = new Date();

    return session;
  }

  /**
   * Stop the current scene on a session
   */
  stopScene(dramaId: string, sceneStatus: 'completed' | 'interrupted' | 'timeout'): Session {
    const session = this.get(dramaId);

    // Must be running to stop
    if (session.status !== SessionStatus.RUNNING) {
      throw new SessionOperationError('Cannot stop scene: session is not running');
    }

    const newStatus = sceneStatus === 'completed'
      ? SessionStatus.COMPLETED
      : sceneStatus === 'interrupted'
      ? SessionStatus.INTERRUPTED
      : SessionStatus.FAILED;

    // Capture scene info before clearing activeSceneId
    const finishedSceneId = session.activeSceneId!;

    session.status = newStatus;
    session.activeSceneId = null;
    session.updatedAt = new Date();

    // Record the scene result
    session.lastResult = {
      sceneId: finishedSceneId,
      status: sceneStatus,
      entryCount: 0, // Will be populated by backend
      conflicts: [],
      beats: [],
    };

    return session;
  }

  /**
   * Update session status directly (with validation)
   */
  updateStatus(dramaId: string, status: SessionStatus): Session {
    const session = this.get(dramaId);

    if (!this.isValidTransition(session.status, status)) {
      throw new InvalidStatusTransitionError(session.status, status);
    }

    session.status = status;
    session.updatedAt = new Date();

    return session;
  }

  /**
   * Validate if a status transition is allowed
   */
  private isValidTransition(from: SessionStatus, to: SessionStatus): boolean {
    // Define allowed transitions
    const allowedTransitions: Map<SessionStatus, SessionStatus[]> = new Map([
      [SessionStatus.CREATED, [SessionStatus.IDLE, SessionStatus.FAILED, SessionStatus.INTERRUPTED]],
      [SessionStatus.IDLE, [SessionStatus.RUNNING, SessionStatus.COMPLETED, SessionStatus.FAILED, SessionStatus.INTERRUPTED]],
      [SessionStatus.RUNNING, [SessionStatus.STOPPING, SessionStatus.FAILED, SessionStatus.INTERRUPTED]],
      [SessionStatus.STOPPING, [SessionStatus.COMPLETED, SessionStatus.FAILED, SessionStatus.INTERRUPTED]],
      [SessionStatus.COMPLETED, []], // Terminal state
      [SessionStatus.INTERRUPTED, []], // Terminal state
      [SessionStatus.FAILED, []], // Terminal state
    ]);

    const validNext = allowedTransitions.get(from);
    return validNext ? validNext.includes(to) : false;
  }
}
