import { Router } from 'express';
import type { Request, Response } from 'express';
import { SessionRegistry } from '../services/sessionRegistry.js';
import { SessionStatus } from '../types/session.js';

/**
 * Create sessions router for browser-facing API
 *
 * Router expects sessionRegistry to be available in app.locals.sessionRegistry
 */
export const sessionsRouter = Router();

/**
 * GET /sessions
 * Returns list of all sessions
 */
sessionsRouter.get('/', (req: Request, res: Response) => {
  try {
    const registry = (req.app.locals as any).sessionRegistry as SessionRegistry;
    const sessions = registry.list();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * GET /sessions/:id
 * Returns specific session by dramaId
 */
sessionsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const registry = (req.app.locals as any).sessionRegistry as SessionRegistry;
    const { id } = req.params;

    const session = registry.get(id);
    res.json(session);
  } catch (err: any) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * POST /sessions
 * Creates a new drama session
 *
 * Body: { name: string, sceneDurationMinutes: number, agentCount: number }
 */
sessionsRouter.post('/', (req: Request, res: Response) => {
  try {
    const registry = (req.app.locals as any).sessionRegistry as SessionRegistry;
    const { name, sceneDurationMinutes, agentCount } = req.body;

    if (!name || !sceneDurationMinutes || !agentCount) {
      return res.status(400).json({ error: 'Missing required fields: name, sceneDurationMinutes, agentCount' });
    }

    const session = registry.create({
      name,
      sceneDurationMinutes,
      agentCount,
    });

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * POST /sessions/:id/scene/start
 * Starts a scene on the session
 */
sessionsRouter.post('/:id/scene/start', (req: Request, res: Response) => {
  try {
    const registry = (req.app.locals as any).sessionRegistry as SessionRegistry;
    const { id } = req.params;

    const session = registry.startScene(id, `scene-${Date.now()}`);
    res.json({
      status: session.status,
      sceneId: session.activeSceneId,
    });
  } catch (err: any) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (err.message.includes('already running') || err.message.includes('must be in created or idle state')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to start scene' });
  }
});

/**
 * POST /sessions/:id/scene/stop
 * Stops the current scene on the session
 *
 * Body: { status: 'completed' | 'interrupted' | 'timeout' }
 */
sessionsRouter.post('/:id/scene/stop', (req: Request, res: Response) => {
  try {
    const registry = (req.app.locals as any).sessionRegistry as SessionRegistry;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['completed', 'interrupted', 'timeout'].includes(status)) {
      return res.status(400).json({ error: 'Invalid or missing status. Must be one of: completed, interrupted, timeout' });
    }

    const session = registry.stopScene(id, status);
    res.json({ status: session.status });
  } catch (err: any) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (err.message.includes('not running')) {
      return res.status(409).json({ error: 'Cannot stop scene: session is not running' });
    }
    res.status(500).json({ error: 'Failed to stop scene' });
  }
});
