import { useState, useRef, useEffect } from 'react';
import './TemplatesTab.css';
import { useAppStore } from '../../store/appStore.js';
import {
  uploadTemplateFile,
  downloadTemplate,
} from '../../utils/templateStorage.js';
import { generateId } from '../../utils/templateStorage.js';
import type { SessionTemplate } from '../../lib/types.js';

interface CreateTemplateFormProps {
  onSubmit: (template: Omit<SessionTemplate, 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialData?: Partial<SessionTemplate> | null;
}

function CreateTemplateForm({ onSubmit, onCancel, initialData }: CreateTemplateFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [agentCount, setAgentCount] = useState(initialData?.config?.agentCount || 3);
  const [sceneDuration, setSceneDuration] = useState(initialData?.config?.sceneDurationMinutes || 30);
  const [maxTokens, setMaxTokens] = useState(initialData?.config?.maxTokens || 2000);
  const [maxTurns, setMaxTurns] = useState(initialData?.config?.maxTurns || 10);
  const [heartbeatInterval, setHeartbeatInterval] = useState(initialData?.config?.heartbeatInterval || 30);
  const [timeoutSeconds, setTimeoutSeconds] = useState(initialData?.config?.timeoutSeconds || 120);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: initialData?.id || generateId(),
      name,
      description,
      config: {
        agentCount,
        sceneDurationMinutes: sceneDuration,
        maxTokens,
        maxTurns,
        heartbeatInterval,
        timeoutSeconds,
      },
    });
  };

  return (
    <div className="create-template-form">
      <h3>{initialData?.id ? 'Edit Template' : 'Create New Template'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter template name"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter template description"
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Agent Count</label>
            <input
              type="number"
              min="1"
              max="10"
              value={agentCount}
              onChange={(e) => setAgentCount(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Scene Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="120"
              value={sceneDuration}
              onChange={(e) => setSceneDuration(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Max Tokens</label>
            <input
              type="number"
              min="500"
              max="4000"
              step="500"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Max Turns</label>
            <input
              type="number"
              min="5"
              max="50"
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Heartbeat Interval (s)</label>
            <input
              type="number"
              min="10"
              max="60"
              value={heartbeatInterval}
              onChange={(e) => setHeartbeatInterval(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Timeout (s)</label>
            <input
              type="number"
              min="30"
              max="300"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button primary">
            Save Template
          </button>
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function TemplatesTab() {
  const {
    templates,
    loadingTemplates,
    savingTemplate,
    selectedTemplate,
    fetchTemplates,
    selectTemplate,
    saveTemplate,
    deleteTemplate,
    useTemplate,
  } = useAppStore();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = () => {
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleEdit = (template: SessionTemplate) => {
    selectTemplate(template);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    selectTemplate(null);
    setIsEditing(false);
  };

  const handleSaveTemplate = (templateData: Omit<SessionTemplate, 'createdAt' | 'updatedAt'>) => {
    saveTemplate(templateData);
    setIsCreating(false);
    setIsEditing(false);
    selectTemplate(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const handleUse = (template: SessionTemplate) => {
    useTemplate(template);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const importedTemplate = await uploadTemplateFile(file);
      if (importedTemplate) {
        saveTemplate(importedTemplate);
      } else {
        alert('Failed to import template');
      }
    }
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleExport = (template: SessionTemplate) => {
    downloadTemplate(template);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="tab-content templates-tab">
      <div className="tab-header">
        <h2>Session Templates</h2>
        <p>Create and manage reusable session templates</p>
      </div>

      <div className="templates-content">
        {isCreating || isEditing ? (
          <div className="template-form-container">
            <CreateTemplateForm
              onSubmit={handleSaveTemplate}
              onCancel={isCreating ? handleCancelCreate : handleCancelEdit}
              initialData={selectedTemplate}
            />
          </div>
        ) : (
          <>
            <div className="templates-list">
              {loadingTemplates ? (
                <div className="loading">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="empty-state">
                  <p>No templates created yet.</p>
                  <p>Click "Create Template" to get started.</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="template-card">
                    <div className="template-header">
                      <div>
                        <h3>{template.name}</h3>
                        <p className="template-description">{template.description}</p>
                      </div>
                      <div className="template-actions">
                        <button
                          className="button small primary"
                          onClick={() => handleUse(template)}
                          disabled={savingTemplate}
                        >
                          Use
                        </button>
                        <button
                          className="button small secondary"
                          onClick={() => handleEdit(template)}
                          disabled={savingTemplate}
                        >
                          Edit
                        </button>
                        <button
                          className="button small"
                          onClick={() => handleExport(template)}
                          disabled={savingTemplate}
                          title="Export"
                        >
                          ↓
                        </button>
                        <button
                          className="button small danger"
                          onClick={() => handleDelete(template.id)}
                          disabled={savingTemplate}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="template-meta">
                      <span>{template.config.agentCount} agents</span>
                      <span>•</span>
                      <span>{template.config.sceneDurationMinutes} mins</span>
                      <span>•</span>
                      <span>Last used: {template.lastUsed ? formatDate(template.lastUsed) : 'Never'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="template-controls">
              <button className="button primary" onClick={handleCreate} disabled={savingTemplate}>
                Create Template
              </button>
              <button className="button secondary" onClick={handleImportClick} disabled={savingTemplate}>
                Import Template
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleImportFile}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
