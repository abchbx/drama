import { useState } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  sceneDuration: number;
  lastUsed: string;
}

export function TemplatesTab() {
  const [templates] = useState<Template[]>([
    {
      id: '1',
      name: 'Romantic Tragedy',
      description: 'Classic Romeo and Juliet style drama',
      agentCount: 2,
      sceneDuration: 30,
      lastUsed: '2026-03-20',
    },
    {
      id: '2',
      name: 'Sci-Fi Adventure',
      description: 'Space exploration with 3 agents',
      agentCount: 3,
      sceneDuration: 45,
      lastUsed: '2026-03-18',
    },
  ]);

  return (
    <div className="tab-content templates-tab">
      <div className="tab-header">
        <h2>Session Templates</h2>
        <p>Create and manage reusable session templates</p>
      </div>

      <div className="templates-content">
        <div className="templates-list">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <div>
                  <h3>{template.name}</h3>
                  <p className="template-description">{template.description}</p>
                </div>
                <div className="template-actions">
                  <button className="button small primary">Use</button>
                  <button className="button small secondary">Edit</button>
                  <button className="button small danger">Delete</button>
                </div>
              </div>
              <div className="template-meta">
                <span>{template.agentCount} agents</span>
                <span>•</span>
                <span>{template.sceneDuration} mins</span>
                <span>•</span>
                <span>Last used: {template.lastUsed}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="template-controls">
          <button className="button primary">Create Template</button>
          <button className="button secondary">Import Template</button>
        </div>
      </div>
    </div>
  );
}
