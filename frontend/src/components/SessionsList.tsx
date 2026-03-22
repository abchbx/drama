import { useEffect } from 'react';
import { useAppStore } from '../store/appStore.js';
import './SessionsList.css';

const statusConfig: Record<string, { color: string; bg: string; icon: string }> = {
  created: {
    color: 'var(--color-text-tertiary)',
    bg: 'var(--color-bg-tertiary)',
    icon: '○'
  },
  idle: {
    color: 'var(--color-text-tertiary)',
    bg: 'var(--color-bg-tertiary)',
    icon: '○'
  },
  running: {
    color: 'var(--color-status-success)',
    bg: 'rgba(48, 209, 88, 0.15)',
    icon: '●'
  },
  stopping: {
    color: 'var(--color-status-warning)',
    bg: 'rgba(255, 214, 10, 0.15)',
    icon: '●'
  },
  completed: {
    color: 'var(--color-accent-blue)',
    bg: 'rgba(10, 132, 255, 0.15)',
    icon: '✓'
  },
  interrupted: {
    color: 'var(--color-accent-orange)',
    bg: 'rgba(255, 159, 10, 0.15)',
    icon: '✕'
  },
  failed: {
    color: 'var(--color-status-error)',
    bg: 'rgba(255, 69, 58, 0.15)',
    icon: '✕'
  },
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
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes < 1 ? 'Just now' : `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function SessionsList() {
  const { sessions, selectedSession, selectSession, fetchSessions } = useAppStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="sessions-list">
      <div className="sessions-list-header">
        <h3>Sessions</h3>
        <span className="session-count badge">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="sessions-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="empty-icon">
            <path d="M24 8v32M8 24h32" stroke="var(--color-border-default)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="empty-text">No sessions yet</p>
          <p className="empty-hint">Create your first session above</p>
        </div>
      ) : (
        <ul className="sessions-items">
          {sessions.map((session) => {
            const config = statusConfig[session.status];
            return (
              <li
                key={session.dramaId}
                className={`session-item ${selectedSession?.dramaId === session.dramaId ? 'selected' : ''}`}
                onClick={() => selectSession(session)}
              >
                <div className="session-left">
                  <div className="session-status">
                    <span className={`status-dot ${session.status === 'running' ? 'pulse' : ''}`}>
                      {config.icon}
                    </span>
                  </div>
                  <div className="session-info">
                    <span className="session-name">{session.name}</span>
                    <span className="session-meta">
                      {formatTimestamp(session.createdAt)}
                    </span>
                  </div>
                </div>
                <span
                  className="status-label"
                  style={{ color: config.color }}
                >
                  {statusLabels[session.status]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
