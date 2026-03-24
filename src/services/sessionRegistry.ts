import { EventEmitter } from 'node:events';
import type { DramaSession, SceneConfig } from '../session.js';
import { Session, SessionStatus } from '../types/session.js';
import type { RouterService } from './router.js';

export interface SessionRegistryEvents {
  sceneCompleted: { dramaId: string; sceneId: string; status: 'completed' | 'interrupted' | 'failed' };
}

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
 * Extended session info that includes the DramaSession instance
 */
interface SessionInfo {
  metadata: Session;
  dramaSession: DramaSession | null;
  registeredAgents: string[]; // Track internally registered agent IDs for cleanup
}

/**
 * In-memory session registry with CRUD operations and scene control
 */
export class SessionRegistry extends EventEmitter {
  private sessions: Map<string, SessionInfo>;

  constructor() {
    super();
    this.sessions = new Map();
  }

  /**
   * Create a new session
   */
  create(input: {
    name: string;
    sceneDurationMinutes: number;
    agentCount: number;
    dramaId?: string;
  }): Session {
    const now = new Date();
    const session: Session = {
      dramaId: input.dramaId ?? crypto.randomUUID(),
      name: input.name,
      sceneDurationMinutes: input.sceneDurationMinutes,
      agentCount: input.agentCount,
      status: SessionStatus.CREATED,
      activeSceneId: null,
      createdAt: now,
      updatedAt: now,
      lastResult: null,
    };

    const sessionInfo: SessionInfo = {
      metadata: session,
      dramaSession: null,
      registeredAgents: [],
    };

    this.sessions.set(session.dramaId, sessionInfo);
    return session;
  }

  /**
   * Attach a DramaSession instance to an existing session
   */
  attachDramaSession(dramaId: string, dramaSession: DramaSession): void {
    const sessionInfo = this.sessions.get(dramaId);
    if (!sessionInfo) {
      throw new SessionNotFoundError(dramaId);
    }
    sessionInfo.dramaSession = dramaSession;
  }

  /**
   * Get the DramaSession instance for a session
   */
  getDramaSession(dramaId: string): DramaSession | null {
    const sessionInfo = this.sessions.get(dramaId);
    return sessionInfo?.dramaSession ?? null;
  }

  /**
   * Get session by dramaId
   */
  get(dramaId: string): Session {
    const sessionInfo = this.sessions.get(dramaId);
    if (!sessionInfo) {
      throw new SessionNotFoundError(dramaId);
    }
    return sessionInfo.metadata;
  }

  /**
   * List all sessions
   */
  list(): Session[] {
    return Array.from(this.sessions.values()).map(info => info.metadata);
  }

  /**
   * Remove a session from the registry
   */
  remove(dramaId: string): boolean {
    const sessionInfo = this.sessions.get(dramaId);
    if (!sessionInfo) {
      throw new SessionNotFoundError(dramaId);
    }
    return this.sessions.delete(dramaId);
  }

  /**
   * Start a scene on a session
   */
  async startScene(
    dramaId: string,
    sceneId: string,
    sceneConfig?: Partial<SceneConfig>,
    routerService?: RouterService
  ): Promise<Session> {
    const sessionInfo = this.sessions.get(dramaId);
    if (!sessionInfo) {
      throw new SessionNotFoundError(dramaId);
    }

    const session = sessionInfo.metadata;

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

    // If we have a DramaSession instance, actually run the scene
    if (sessionInfo.dramaSession) {
      console.log(`[SessionRegistry] DramaSession found, checking routerService...`);
      // Register internal agents with routerService for dashboard visibility
      if (routerService) {
        const dramaSession = sessionInfo.dramaSession;
        const actorIds = Array.from(dramaSession['actors'].keys() as IterableIterator<string>);
        console.log(`[SessionRegistry] Found ${actorIds.length} actors in DramaSession`);

        const directorId = `director-${dramaId}`;

        // Register director
        console.log(`[SessionRegistry] Registering director: ${directorId}`);
        routerService.registerInternalAgent(directorId, 'director');
        sessionInfo.registeredAgents.push(directorId);

        // Register all actors
        for (const actorId of actorIds) {
          console.log(`[SessionRegistry] Registering actor: ${actorId}`);
          routerService.registerInternalAgent(actorId, 'actor');
          sessionInfo.registeredAgents.push(actorId);
        }

        console.log(`[SessionRegistry] Registered ${sessionInfo.registeredAgents.length} internal agents for dashboard`);
      } else {
        console.log(`[SessionRegistry] routerService is undefined, skipping agent registration`);
      }

      // Build scene config with defaults
      // Use session's sceneDurationMinutes for timeout if available
      const sceneDurationMs = (session.sceneDurationMinutes ?? 10) * 60 * 1000;
      const fullSceneConfig: SceneConfig = {
        id: sceneId,
        location: sceneConfig?.location ?? 'Default Location',
        description: sceneConfig?.description ?? 'Scene started from dashboard',
        tone: sceneConfig?.tone ?? 'dramatic',
        actorIds: sceneConfig?.actorIds ?? Array.from(sessionInfo.dramaSession['actors'].keys()),
        durationMs: sceneDurationMs, // Pass user-set duration to scene
      };

      // Run scene asynchronously (don't await - let it run in background)
      console.log(`[SessionRegistry] Starting scene runScene with config:`, JSON.stringify(fullSceneConfig));
      console.log(`[SessionRegistry] Scene duration: ${session.sceneDurationMinutes} minutes (${sceneDurationMs}ms)`);
      sessionInfo.dramaSession.runScene(fullSceneConfig).then((result) => {
        console.log(`[SessionRegistry] Scene ${sceneId} completed with status: ${result.status}`);
        // Update session status based on result
        session.status = result.status === 'completed' ? SessionStatus.COMPLETED : SessionStatus.INTERRUPTED;
        session.lastResult = {
          sceneId: result.sceneId,
          status: result.status,
          entryCount: result.entryCount,
          conflicts: result.conflicts,
          beats: result.beats,
        };
        session.activeSceneId = null;
        session.updatedAt = new Date();

        // Unregister internal agents when scene completes
        if (routerService && sessionInfo.registeredAgents.length > 0) {
          console.log(`[SessionRegistry] Unregistering ${sessionInfo.registeredAgents.length} internal agents`);
          for (const agentId of sessionInfo.registeredAgents) {
            routerService.unregisterInternalAgent(agentId);
          }
          sessionInfo.registeredAgents = [];
        }
      }).catch((err) => {
        console.error(`[SessionRegistry] Scene ${sceneId} failed:`, err);
        session.status = SessionStatus.FAILED;
        session.activeSceneId = null;
        session.updatedAt = new Date();

        // Unregister internal agents on error too
        if (routerService && sessionInfo.registeredAgents.length > 0) {
          console.log(`[SessionRegistry] Unregistering ${sessionInfo.registeredAgents.length} internal agents after error`);
          for (const agentId of sessionInfo.registeredAgents) {
            routerService.unregisterInternalAgent(agentId);
          }
          sessionInfo.registeredAgents = [];
        }
      });
    }

    return session;
  }

  /**
   * Stop the current scene on a session
   */
  stopScene(dramaId: string, sceneStatus: 'completed' | 'interrupted' | 'timeout'): Session {
    const sessionInfo = this.sessions.get(dramaId);
    if (!sessionInfo) {
      throw new SessionNotFoundError(dramaId);
    }

    const session = sessionInfo.metadata;

    // Handle race condition: scene may have completed naturally before user clicked stop
    // If already in a terminal state, return success (scene is already stopped)
    if (session.status === SessionStatus.COMPLETED ||
        session.status === SessionStatus.INTERRUPTED ||
        session.status === SessionStatus.FAILED) {
      console.log(`[SessionRegistry] Scene ${session.activeSceneId} already completed with status: ${session.status}`);
      return session;
    }

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
    const sessionInfo = this.sessions.get(dramaId);
    if (!sessionInfo) {
      throw new SessionNotFoundError(dramaId);
    }

    const session = sessionInfo.metadata;

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
