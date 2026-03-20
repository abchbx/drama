import type pino from 'pino';

export interface ActorTimerEntry {
  timer: ReturnType<typeof setTimeout>;
  sceneId: string;
  actorId: string;
  retryAttempt: number;
}

export interface TimeoutManagerOptions {
  actorTimeoutMs: number;
  actorRetryTimeoutMs: number;
  sceneTimeoutMs: number;
  onActorTimeout?: (actorId: string, sceneId: string, retryAttempt: number) => void;
  onSceneCeiling?: () => void;
}

/**
 * TimeoutManager — per-actor timers, retry logic, and scene-level ceiling timer.
 *
 * Handles:
 * - Per-actor turn timers with one retry at 50% timeout
 * - Scene-level ceiling timer (hard stop regardless of state)
 * - Timer cancellation on success or disconnect
 */
export class TimeoutManager {
  private readonly actorTimeoutMs: number;
  private readonly actorRetryTimeoutMs: number;
  private readonly sceneTimeoutMs: number;
  private readonly logger: pino.Logger;
  private readonly onActorTimeout?: (actorId: string, sceneId: string, retryAttempt: number) => void;
  private readonly onSceneCeiling?: () => void;

  /** actorId → active timer entry */
  private readonly actorTimers = new Map<string, ActorTimerEntry>();
  /** sceneId → active ceiling timer */
  private readonly sceneTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(logger: pino.Logger, options: TimeoutManagerOptions) {
    this.logger = logger;
    this.actorTimeoutMs = options.actorTimeoutMs;
    this.actorRetryTimeoutMs = options.actorRetryTimeoutMs;
    this.sceneTimeoutMs = options.sceneTimeoutMs;
    this.onActorTimeout = options.onActorTimeout;
    this.onSceneCeiling = options.onSceneCeiling;
  }

  /**
   * Start the per-actor turn timer.
   * If the actor does not respond within actorTimeoutMs, fires the retry callback.
   * On second timeout (retryAttempt >= 1), fires the skip callback.
   */
  startActorTimer(actorId: string, sceneId: string): number {
    // Cancel any existing timer for this actor
    this.cancelActorTimer(actorId);

    const entry: ActorTimerEntry = {
      timer: setTimeout(() => {
        this.actorTimers.delete(actorId);
        this.onActorTimeout?.(actorId, sceneId, entry.retryAttempt);
      }, this.actorTimeoutMs),
      sceneId,
      actorId,
      retryAttempt: 0,
    };

    this.actorTimers.set(actorId, entry);
    this.logger.debug({ actorId, sceneId, timeoutMs: this.actorTimeoutMs }, 'timeout: actor timer started');
    return this.actorTimeoutMs;
  }

  /**
   * Restart the actor timer with the retry timeout (50% of original).
   * Called when the first timeout fires but we want to give the actor one more chance.
   */
  retryActorTimer(actorId: string, sceneId: string): void {
    this.cancelActorTimer(actorId);

    const entry: ActorTimerEntry = {
      timer: setTimeout(() => {
        this.actorTimers.delete(actorId);
        // Second timeout: skip the actor
        this.onActorTimeout?.(actorId, sceneId, 1);
      }, this.actorRetryTimeoutMs),
      sceneId,
      actorId,
      retryAttempt: 1,
    };

    this.actorTimers.set(actorId, entry);
    this.logger.debug({ actorId, sceneId, timeoutMs: this.actorRetryTimeoutMs }, 'timeout: actor timer retry started');
  }

  /** Cancel and clear the per-actor timer (e.g. on successful response). */
  cancelActorTimer(actorId: string): void {
    const existing = this.actorTimers.get(actorId);
    if (existing) {
      clearTimeout(existing.timer);
      this.actorTimers.delete(actorId);
      this.logger.debug({ actorId }, 'timeout: actor timer cancelled');
    }
  }

  /** Pause the actor timer during a grace period (e.g. disconnect). */
  pauseActorTimer(actorId: string): { remaining: number } | null {
    const entry = this.actorTimers.get(actorId);
    if (!entry) return null;
    // For simplicity, we cancel and return the retry attempt count so the
    // timer can be resumed with the correct retry state on reconnect.
    clearTimeout(entry.timer);
    this.actorTimers.delete(actorId);
    this.logger.debug({ actorId, retryAttempt: entry.retryAttempt }, 'timeout: actor timer paused');
    return { remaining: entry.retryAttempt };
  }

  /** Resume actor timer (after reconnect or grace period). */
  resumeActorTimer(actorId: string, sceneId: string, retryAttempt: number): void {
    const timeoutMs = retryAttempt >= 1 ? this.actorRetryTimeoutMs : this.actorTimeoutMs;
    const entry: ActorTimerEntry = {
      timer: setTimeout(() => {
        this.actorTimers.delete(actorId);
        this.onActorTimeout?.(actorId, sceneId, retryAttempt);
      }, timeoutMs),
      sceneId,
      actorId,
      retryAttempt,
    };
    this.actorTimers.set(actorId, entry);
    this.logger.debug({ actorId, sceneId, timeoutMs, retryAttempt }, 'timeout: actor timer resumed');
  }

  /** Start a scene-level ceiling timer. If nothing stops the scene, it ends automatically. */
  startSceneTimer(sceneId: string): void {
    this.cancelSceneTimer(sceneId);
    const timer = setTimeout(() => {
      this.sceneTimers.delete(sceneId);
      this.logger.warn({ sceneId }, 'timeout: scene ceiling reached');
      this.onSceneCeiling?.();
    }, this.sceneTimeoutMs);
    this.sceneTimers.set(sceneId, timer);
    this.logger.debug({ sceneId, timeoutMs: this.sceneTimeoutMs }, 'timeout: scene ceiling timer started');
  }

  /** Cancel the scene-level ceiling timer (e.g. scene ends normally). */
  cancelSceneTimer(sceneId: string): void {
    const existing = this.sceneTimers.get(sceneId);
    if (existing) {
      clearTimeout(existing);
      this.sceneTimers.delete(sceneId);
    }
  }

  /** Stop all timers (e.g. on shutdown). */
  stopAll(): void {
    for (const entry of this.actorTimers.values()) {
      clearTimeout(entry.timer);
    }
    this.actorTimers.clear();
    for (const timer of this.sceneTimers.values()) {
      clearTimeout(timer);
    }
    this.sceneTimers.clear();
  }
}
