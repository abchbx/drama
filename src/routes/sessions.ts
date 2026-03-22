import { Router } from 'express';
import type { Request, Response } from 'express';
import { SessionRegistry } from '../services/sessionRegistry.js';
import { RouterService } from '../services/router.js';
import { SessionStatus } from '../types/session.js';
import { ExportService, ExportFormat } from '../services/exportService.js';

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
    const dramaId = Array.isArray(id) ? id[0] : id;

    if (!dramaId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const session = registry.get(dramaId);
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
    const dramaId = Array.isArray(id) ? id[0] : id;

    if (!dramaId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const session = registry.startScene(dramaId, `scene-${Date.now()}`);

    // Emit Socket.IO events for scene state changes (null-safe)
    const routerService = (req.app.locals as any).routerService as RouterService | undefined;
    if (routerService?.io) {
      const sceneId = session.activeSceneId;
      routerService.io.emit('scene_started', { dramaId, sceneId, status: session.status });
      routerService.io.emit('session_state', { dramaId, status: session.status, activeSceneId: sceneId });
    }

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
    const dramaId = Array.isArray(id) ? id[0] : id;

    if (!dramaId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    if (!status || !['completed', 'interrupted', 'timeout'].includes(status)) {
      return res.status(400).json({ error: 'Invalid or missing status. Must be one of: completed, interrupted, timeout' });
    }

    const session = registry.stopScene(dramaId, status);

    // Emit Socket.IO events for scene state changes (null-safe)
    const routerService = (req.app.locals as any).routerService as RouterService | undefined;
    if (routerService?.io) {
      const finishedSceneId = session.lastResult?.sceneId;
      const finalStatus = session.status;
      routerService.io.emit('scene_stopped', { dramaId, sceneId: finishedSceneId, status: status });
      routerService.io.emit('session_state', { dramaId, status: finalStatus, activeSceneId: null });
    }

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

/**
 * GET /sessions/:id/export?format=json|markdown
 * Exports a completed session in the specified format
 */
sessionsRouter.get('/:id/export', (req: Request, res: Response) => {
  try {
    const registry = (req.app.locals as any).sessionRegistry as SessionRegistry;
    const blackboardService = (req.app.locals as any).blackboardService as any;

    if (!blackboardService) {
      return res.status(500).json({ error: 'Blackboard service not available' });
    }

    const { id } = req.params;
    const dramaId = Array.isArray(id) ? id[0] : id;
    const formatParam = req.query.format as string || 'json';

    if (!dramaId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    // Validate format
    const format = formatParam === 'markdown' ? ExportFormat.MARKDOWN : ExportFormat.JSON;

    // Check if session exists
    const session = registry.get(dramaId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Create export service and export
    const exportService = new ExportService(registry, blackboardService);
    const result = exportService.exportSession(dramaId, format);

    result
      .then((exportData) => {
        // Set appropriate content type
        const contentType = format === ExportFormat.JSON
          ? 'application/json'
          : 'text/markdown';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
        res.send(exportData.content);
      })
      .catch((err: any) => {
        res.status(400).json({ error: err.message || 'Export failed' });
      });
  } catch (err: any) {
    res.status(500).json({ error: 'Export failed: ' + (err.message || 'Unknown error') });
  }
});
