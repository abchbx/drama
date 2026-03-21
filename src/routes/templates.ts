import { Router } from 'express';
import type { Request, Response } from 'express';

/**
 * Session Template interface (mirrors frontend/src/lib/types.ts SessionTemplate)
 */
export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  config: {
    agentCount: number;
    sceneDurationMinutes: number;
    maxTokens?: number;
    maxTurns?: number;
    heartbeatInterval?: number;
    timeoutSeconds?: number;
  };
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  config: {
    agentCount: number;
    sceneDurationMinutes: number;
    maxTokens?: number;
    maxTurns?: number;
    heartbeatInterval?: number;
    timeoutSeconds?: number;
  };
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  config?: {
    agentCount?: number;
    sceneDurationMinutes?: number;
    maxTokens?: number;
    maxTurns?: number;
    heartbeatInterval?: number;
    timeoutSeconds?: number;
  };
  lastUsed?: string;
}

// In-memory storage for templates
const templates = new Map<string, SessionTemplate>();

export const templatesRouter = Router();

/**
 * GET /api/templates
 * Returns all templates
 */
templatesRouter.get('/', (_req: Request, res: Response) => {
  try {
    const allTemplates = Array.from(templates.values());
    res.json({ templates: allTemplates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * GET /api/templates/:id
 * Returns a single template by ID
 */
templatesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const templateId = Array.isArray(id) ? id[0] : id;

    if (!templateId) {
      return res.status(400).json({ error: 'Missing template ID' });
    }

    const template = templates.get(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * POST /api/templates
 * Creates a new template
 */
templatesRouter.post('/', (req: Request, res: Response) => {
  try {
    const input = req.body as CreateTemplateInput;

    // Validate required fields
    if (!input.name) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!input.config) {
      return res.status(400).json({ error: 'config is required' });
    }
    if (!input.config.agentCount) {
      return res.status(400).json({ error: 'config.agentCount is required' });
    }
    if (!input.config.sceneDurationMinutes) {
      return res.status(400).json({ error: 'config.sceneDurationMinutes is required' });
    }

    const now = new Date().toISOString();
    const template: SessionTemplate = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description || '',
      config: {
        agentCount: input.config.agentCount,
        sceneDurationMinutes: input.config.sceneDurationMinutes,
        maxTokens: input.config.maxTokens,
        maxTurns: input.config.maxTurns,
        heartbeatInterval: input.config.heartbeatInterval,
        timeoutSeconds: input.config.timeoutSeconds,
      },
      createdAt: now,
      updatedAt: now,
    };

    templates.set(template.id, template);
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * PUT /api/templates/:id
 * Updates an existing template
 */
templatesRouter.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const templateId = Array.isArray(id) ? id[0] : id;

    if (!templateId) {
      return res.status(400).json({ error: 'Missing template ID' });
    }

    const existing = templates.get(templateId);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const input = req.body as UpdateTemplateInput;

    // Update fields if provided
    if (input.name !== undefined) {
      existing.name = input.name;
    }
    if (input.description !== undefined) {
      existing.description = input.description;
    }
    if (input.config) {
      existing.config = {
        ...existing.config,
        ...input.config,
      };
    }
    if (input.lastUsed !== undefined) {
      existing.lastUsed = input.lastUsed;
    }

    existing.updatedAt = new Date().toISOString();
    templates.set(templateId, existing);

    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/templates/:id
 * Deletes a template
 */
templatesRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const templateId = Array.isArray(id) ? id[0] : id;

    if (!templateId) {
      return res.status(400).json({ error: 'Missing template ID' });
    }

    const existing = templates.get(templateId);
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    templates.delete(templateId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});
