import { useState } from 'react';
import { useAppStore } from '../store/appStore.js';
import { SceneControls } from './SceneControls.js';
import './SessionPanel.css';

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

type TabType = 'info' | 'scene' | 'history';

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function SessionPanel() {
  const { selectedSession: session } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>('info');

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

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'info', label: 'Session Info', icon: '◆' },
    { id: 'scene', label: 'Current Scene', icon: '▶' },
    { id: 'history', label: 'History', icon: '◈' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="tab-content-inner">
            <div className="detail-section">
              <h3>Basic Information</h3>
              <dl>
                <div className="detail-item">
                  <dt>Session Name</dt>
                  <dd>{session.name}</dd>
                </div>
                <div className="detail-item">
                  <dt>Drama ID</dt>
                  <dd className="monospace">{session.dramaId}</dd>
                </div>
                <div className="detail-item">
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={`status-badge ${session.status === 'running' ? 'pulse' : ''}`}
                      style={{ backgroundColor: statusColors[session.status] }}
                    >
                      {statusLabels[session.status]}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="detail-section">
              <h3>Configuration</h3>
              <dl>
                <div className="detail-item">
                  <dt>Scene Duration</dt>
                  <dd>{session.sceneDurationMinutes} minutes</dd>
                </div>
                <div className="detail-item">
                  <dt>Agent Count</dt>
                  <dd>{session.agentCount} agents</dd>
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
          </div>
        );

      case 'scene':
        return (
          <div className="tab-content-inner scene-tab-content">
            <div className="detail-section scene-controls-section">
              <h3>Scene Controls</h3>
              <p className="section-hint">
                {session.status === 'running'
                  ? 'The scene is currently running. You can stop it using the controls below.'
                  : 'Start a new scene with the controls below.'}
              </p>
              <SceneControls />
            </div>

            <div className="detail-section scene-status-section">
              <h3>Scene Status</h3>
              <div className="scene-status-display">
                {session.activeSceneId ? (
                  <>
                    <div className="scene-status-indicator running">
                      <span className="pulse-dot"></span>
                      Scene Active
                    </div>
                    <div className="detail-item">
                      <dt>Active Scene ID</dt>
                      <dd className="monospace">{session.activeSceneId}</dd>
                    </div>
                  </>
                ) : session.lastResult ? (
                  <>
                    <div className={`scene-status-indicator ${session.lastResult.status}`}>
                      <span className={`status-dot ${session.lastResult.status}`}></span>
                      Last Scene: {session.lastResult.status === 'completed' ? 'Completed' : session.lastResult.status === 'interrupted' ? 'Interrupted' : 'Failed'}
                    </div>
                    <div className="detail-item">
                      <dt>Scene ID</dt>
                      <dd className="monospace">{session.lastResult.sceneId}</dd>
                    </div>
                    <div className="detail-item">
                      <dt>Entries</dt>
                      <dd>{session.lastResult.entryCount}</dd>
                    </div>
                  </>
                ) : (
                  <div className="scene-status-indicator idle">
                    <span className="idle-dot"></span>
                    No Active Scene
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="tab-content-inner">
            <div className="detail-section">
              <h3>Last Scene Result</h3>
              {session.lastResult ? (
                <dl>
                  <div className="detail-item">
                    <dt>Scene ID</dt>
                    <dd className="monospace">{session.lastResult.sceneId}</dd>
                  </div>
                  <div className="detail-item">
                    <dt>Status</dt>
                    <dd>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor:
                            session.lastResult.status === 'completed'
                              ? '#89b4fa'
                              : session.lastResult.status === 'interrupted'
                              ? '#fab387'
                              : '#f38ba8',
                        }}
                      >
                        {session.lastResult.status}
                      </span>
                    </dd>
                  </div>
                  <div className="detail-item">
                    <dt>Entry Count</dt>
                    <dd>{session.lastResult.entryCount} entries</dd>
                  </div>
                  {session.lastResult.beats.length > 0 && (
                    <div className="detail-item beats-item">
                      <dt>Scene Beats</dt>
                      <dd>
                        <ol className="beats-list">
                          {session.lastResult.beats.map((beat, index) => (
                            <li key={index}>{beat}</li>
                          ))}
                        </ol>
                      </dd>
                    </div>
                  )}
                  {session.lastResult.conflicts.length > 0 && (
                    <div className="detail-item">
                      <dt>Conflicts</dt>
                      <dd>
                        <ul className="conflicts-list">
                          {session.lastResult.conflicts.map((conflict, index) => (
                            <li key={index} className="conflict-item">{conflict}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="empty-state">
                  <p className="no-result">No scene has been completed yet</p>
                  <p className="empty-hint">Complete a scene to see the results here.</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="session-panel">
      <div className="session-panel-header">
        <div className="session-header-left">
          <h2>{session.name}</h2>
          <span
            className={`status-indicator ${session.status === 'running' ? 'pulse' : ''}`}
            style={{ backgroundColor: statusColors[session.status] }}
          >
            {statusLabels[session.status]}
          </span>
        </div>
      </div>

      <div className="session-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`session-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="session-panel-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
