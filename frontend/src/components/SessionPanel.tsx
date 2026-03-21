import { useAppStore } from '../store/appStore.js';
import { SceneControls } from './SceneControls.js';

const statusColors: Record<string, string> = {
  created: '#6c7086',
  idle: '#6c7086',
  running: '#a6e3a1',
  stopping: '#f9e2af',
  completed: '#89b4fa',
  interrupted: '#fab387',
  failed: '#f38ba8',
};

const statusLabels: Record<string, string> = {
  created: 'Created',
  idle: 'Idle',
  running: 'Running',
  stopping: 'Stopping',
  completed: 'Completed',
  interrupted: 'Interrupted',
  failed: 'Failed',
};

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function SessionPanel() {
  const { selectedSession: session } = useAppStore();

  // When a session is selected, we may want to fetch its detailed information
  // For now, we display the basic metadata from the list

  if (!session) {
    return (
      <div className="session-panel">
        <div className="no-selection">
          <h2>Session Details</h2>
          <p>Select a session to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-panel">
      <div className="session-panel-header">
        <h2>{session.name}</h2>
        <span
          className={`status-indicator ${session.status === 'running' ? 'pulse' : ''}`}
          style={{ backgroundColor: statusColors[session.status] }}
        >
          {statusLabels[session.status]}
        </span>
        <SceneControls />
      </div>

      <div className="session-panel-content">
        <div className="details-grid">
          <div className="detail-section">
            <h3>Session Info</h3>
            <dl>
              <div className="detail-item">
                <dt>Drama ID</dt>
                <dd>{session.dramaId}</dd>
              </div>
              <div className="detail-item">
                <dt>Status</dt>
                <dd>{statusLabels[session.status]}</dd>
              </div>
              <div className="detail-item">
                <dt>Scene Duration</dt>
                <dd>{session.sceneDurationMinutes} minutes</dd>
              </div>
              <div className="detail-item">
                <dt>Agent Count</dt>
                <dd>{session.agentCount}</dd>
              </div>
            </dl>
          </div>

          <div className="detail-section">
            <h3>Timestamps</h3>
            <dl>
              <div className="detail-item">
                <dt>Created</dt>
                <dd>{formatTimestamp(session.createdAt)}</dd>
              </div>
              <div className="detail-item">
                <dt>Last Updated</dt>
                <dd>{formatTimestamp(session.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="detail-section">
            <h3>Current Scene</h3>
            <dl>
              <div className="detail-item">
                <dt>Scene ID</dt>
                <dd>{session.activeSceneId || 'No scene started'}</dd>
              </div>
            </dl>
          </div>

          <div className="detail-section">
            <h3>Last Result</h3>
            {session.lastResult ? (
              <dl>
                <div className="detail-item">
                  <dt>Result ID</dt>
                  <dd>{session.lastResult.sceneId}</dd>
                </div>
                <div className="detail-item">
                  <dt>Status</dt>
                  <dd>{session.lastResult.status}</dd>
                </div>
                <div className="detail-item">
                  <dt>Entry Count</dt>
                  <dd>{session.lastResult.entryCount}</dd>
                </div>
                {session.lastResult.beats.length > 0 && (
                  <div className="detail-item">
                    <dt>Beats</dt>
                    <dd>
                      <ul className="beats-list">
                        {session.lastResult.beats.map((beat, index) => (
                          <li key={index}>{beat}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="no-result">No scene has been completed yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
