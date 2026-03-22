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

  // Filter only completed sessions
  const completedSessions = sessions.filter(s => s.status === 'completed');

  const handleExport = () => {
    clearExportError();
    exportScript();
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
            </div>
          </div>

          {/* Error Message */}
          {exportError && (
            <div className="export-error">
              {exportError}
              <button
                className="error-dismiss"
                onClick={clearExportError}
                type="button"
              >
                ×
              </button>
            </div>
          )}

          {/* Export Button */}
          <button
            className="export-button"
            onClick={handleExport}
            disabled={!selectedExportSessionId || exporting}
          >
            {exporting ? 'Exporting...' : 'Export Script'}
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
