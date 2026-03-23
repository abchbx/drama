import { useState } from 'react';
import { useAppStore } from '../store/appStore.js';
import './ExportTab.css';

export function ExportTab() {
  const {
    sessions,
    selectedExportSessionId,
    selectedExportFormat,
    exporting,
    exportError,
    setSelectedExportSessionId,
    setSelectedExportFormat,
    exportScript,
    clearExportError,
  } = useAppStore();

  const [showTechnicalError, setShowTechnicalError] = useState(false);
  const [technicalError, setTechnicalError] = useState<string | null>(null);

  // Filter only completed sessions
  const completedSessions = sessions.filter(s => s.status === 'completed');

  const handleExport = async () => {
    clearExportError();
    setTechnicalError(null);
    setShowTechnicalError(false);

    // Get the current error from store after export
    await exportScript();

    // Check if there's a technical error in the response
    const state = useAppStore.getState();
    if (state.exportError) {
      // Try to get more detailed error information
      try {
        const session = sessions.find(s => s.dramaId === selectedExportSessionId);
        if (session) {
          // The technical error will be set by the API client
          // We'll display it if available
        }
      } catch (e) {
        console.error('Failed to get technical error details:', e);
      }
    }
  };

  const handleRetry = () => {
    handleExport();
  };

  return (
    <div className="export-tab">
      <div className="export-content">
        <h2>Export Script</h2>
        <p>Export completed drama sessions in JSON or Markdown format.</p>

        <div className="export-form">
          {/* Session Selector */}
          <div className="form-group">
            <label htmlFor="session-select">Select Session</label>
            <select
              id="session-select"
              value={selectedExportSessionId || ''}
              onChange={(e) => setSelectedExportSessionId(e.target.value || null)}
              disabled={exporting}
            >
              <option value="">-- Select a session --</option>
              {completedSessions.map((session) => (
                <option key={session.dramaId} value={session.dramaId}>
                  {session.name} ({new Date(session.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Format Selection */}
          <div className="form-group">
            <label>Export Format</label>
            <div className="format-radio-group">
              <label className="format-radio">
                <input
                  type="radio"
                  value="json"
                  checked={selectedExportFormat === 'json'}
                  onChange={() => setSelectedExportFormat('json')}
                  disabled={exporting}
                />
                <span>JSON</span>
              </label>
              <label className="format-radio">
                <input
                  type="radio"
                  value="markdown"
                  checked={selectedExportFormat === 'markdown'}
                  onChange={() => setSelectedExportFormat('markdown')}
                  disabled={exporting}
                />
                <span>Markdown</span>
              </label>
              <label className="format-radio">
                <input
                  type="radio"
                  value="pdf"
                  checked={selectedExportFormat === 'pdf'}
                  onChange={() => setSelectedExportFormat('pdf')}
                  disabled={exporting}
                />
                <span>PDF</span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {exportError && (
            <div className="export-error">
              <div className="error-message-content">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{exportError}</span>
              </div>
              <div className="error-actions-row">
                <button
                  className="error-retry"
                  onClick={handleRetry}
                  disabled={exporting}
                  type="button"
                >
                  重试
                </button>
                <button
                  className="error-dismiss"
                  onClick={clearExportError}
                  type="button"
                >
                  关闭
                </button>
              </div>
              {technicalError && (
                <details className="export-technical-error">
                  <summary onClick={(e) => { e.preventDefault(); setShowTechnicalError(!showTechnicalError); }}>
                    技术详情 {showTechnicalError ? '▼' : '▶'}
                  </summary>
                  {showTechnicalError && (
                    <pre className="technical-error-content">{technicalError}</pre>
                  )}
                </details>
              )}
            </div>
          )}

          {/* Export Button */}
          <button
            className="export-button"
            onClick={handleExport}
            disabled={!selectedExportSessionId || exporting}
          >
            {exporting ? '正在导出...' : '导出脚本'}
          </button>

          {/* Empty State */}
          {completedSessions.length === 0 && (
            <div className="export-empty-state">
              <h3>No Completed Sessions</h3>
              <p>Complete a session to generate exportable scripts. Sessions must have status "completed" to export.</p>
            </div>
          )}

          {/* Selected Session Preview */}
          {selectedExportSessionId && (
            <div className="export-preview">
              <h4>Selected Session</h4>
              {(() => {
                const session = sessions.find(s => s.dramaId === selectedExportSessionId);
                if (!session) return null;
                return (
                  <div className="preview-details">
                    <div className="preview-row">
                      <span className="preview-label">Name:</span>
                      <span className="preview-value">{session.name}</span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Status:</span>
                      <span className="preview-value">{session.status}</span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Created:</span>
                      <span className="preview-value">{new Date(session.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Duration:</span>
                      <span className="preview-value">{session.sceneDurationMinutes} min</span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Actors:</span>
                      <span className="preview-value">{session.agentCount}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
