import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { CapabilityService, type AgentJwtPayload } from '../services/capability.js';
import { BlackboardService } from '../services/blackboard.js';
import { NotFoundError } from '../types/blackboard.js';

export { CapabilityService };

// Capability service — injected via setCapabilityService() at startup
let capabilityService: CapabilityService | undefined;

export function setCapabilityService(s: CapabilityService): void {
  capabilityService = s;
}

export const agentsRouter = Router({ mergeParams: true });

// POST /blackboard/agents/register
agentsRouter.post('/register', (req, res) => {
  if (!capabilityService) {
    return res.status(500).json({ error: 'Internal Server Error', message: 'Capability service not initialized' });
  }

  const parsed = z.object({
    agentId: z.string().min(1),
    role: z.enum(['Actor', 'Director', 'Admin']),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', message: parsed.error.message });
  }

  const { agentId, role } = parsed.data;

  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '24h') as jwt.SignOptions['expiresIn'];
  const token = jwt.sign(
    { agentId, role },
    capabilityService.jwtSecret,
    { expiresIn, algorithm: 'HS256' } as jwt.SignOptions,
  );

  return res.status(200).json({ token, agentId, role });
});

// GET /blackboard/agents/me/scope
agentsRouter.get('/me/scope', (req, res) => {
  if (!capabilityService) {
    return res.status(500).json({ error: 'Internal Server Error', message: 'Capability service not initialized' });
  }

  let agent: AgentJwtPayload;
  try {
    agent = capabilityService.verify(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing token' });
  }

  const blackboard = req.app.locals.blackboard as BlackboardService;

  if (agent.role === 'Actor') {
    const character_card = null;
    let current_scene: unknown = null;
    try {
      current_scene = blackboard.readEntry('semantic', 'current_scene');
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
      // NotFoundError → return null for current_scene
    }
    return res.status(200).json({ character_card, current_scene });
  }

  // Director and Admin have full access
  return res.status(200).json({ full_access: true });
});
