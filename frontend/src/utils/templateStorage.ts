import type { SessionTemplate } from '../lib/types.js';

const STORAGE_KEY = 'drama_session_templates';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function saveLocalTemplate(template: Omit<SessionTemplate, 'createdAt' | 'updatedAt'>): SessionTemplate {
  const templates = getLocalTemplates();
  const now = new Date().toISOString();

  const existingIndex = templates.findIndex(t => t.id === template.id);

  if (existingIndex >= 0) {
    // Update existing template
    templates[existingIndex] = {
      ...templates[existingIndex],
      ...template,
      updatedAt: now,
    };
  } else {
    // Create new template
    const newTemplate: SessionTemplate = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };
    templates.push(newTemplate);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return existingIndex >= 0 ? templates[existingIndex] : templates[templates.length - 1];
}

export function getLocalTemplates(): SessionTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load templates from localStorage:', error);
    return [];
  }
}

export function getLocalTemplate(id: string): SessionTemplate | undefined {
  const templates = getLocalTemplates();
  return templates.find(t => t.id === id);
}

export function deleteLocalTemplate(id: string): void {
  const templates = getLocalTemplates().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function updateLastUsed(id: string): void {
  const templates = getLocalTemplates();
  const template = templates.find(t => t.id === id);
  if (template) {
    template.lastUsed = new Date().toISOString();
    template.updatedAt = template.lastUsed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }
}

export function exportTemplate(template: SessionTemplate): string {
  return JSON.stringify(template, null, 2);
}

export function exportTemplates(templates: SessionTemplate[]): string {
  return JSON.stringify(templates, null, 2);
}

export function importTemplate(jsonString: string): SessionTemplate | null {
  try {
    const template = JSON.parse(jsonString);

    // Validate required fields
    if (!template.name || !template.config) {
      throw new Error('Invalid template: missing required fields');
    }

    // Ensure it has an ID and timestamps
    return {
      id: template.id || generateId(),
      name: template.name,
      description: template.description || '',
      config: {
        agentCount: template.config.agentCount || 2,
        sceneDurationMinutes: template.config.sceneDurationMinutes || 30,
        maxTokens: template.config.maxTokens,
        maxTurns: template.config.maxTurns,
        heartbeatInterval: template.config.heartbeatInterval,
        timeoutSeconds: template.config.timeoutSeconds,
      },
      createdAt: template.createdAt || new Date().toISOString(),
      updatedAt: template.updatedAt || new Date().toISOString(),
      lastUsed: template.lastUsed,
    };
  } catch (error) {
    console.error('Failed to import template:', error);
    return null;
  }
}

export function downloadTemplate(template: SessionTemplate): void {
  const blob = new Blob([exportTemplate(template)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function uploadTemplateFile(file: File): Promise<SessionTemplate | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(importTemplate(content));
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
