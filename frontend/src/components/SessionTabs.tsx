import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore.js';
import './SessionTabs.css';

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

export function SessionTabs() {
  const { sessions, selectedSession, selectSession, deleteSession, fetchSessions, lastError } = useAppStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (e: React.MouseEvent, dramaId: string) => {
    e.stopPropagation();
    console.log('[SessionTabs] handleDelete called with dramaId:', dramaId, 'length:', dramaId.length);
    setDeletingId(dramaId);
    try {
      await deleteSession(dramaId);
      // deleteSession already calls fetchSessions() internally
    } catch (error) {
      console.error('[SessionTabs] Delete failed:', error);
      // Refresh on error to ensure UI is in sync with backend
      await fetchSessions();
    } finally {
      setDeletingId(null);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="session-tabs-empty">
        <span className="empty-text">No sessions</span>
      </div>
    );
  }

  return (
    <div className="session-tabs-wrapper">
      {lastError && (
        <div className="session-tabs-error">
          <span className="error-icon">⚠</span>
          {lastError}
        </div>
      )}
      <div className="session-tabs-container">
        <div className="session-tabs-scroll">
          {sessions.map((session) => {
            const config = statusConfig[session.status];
            const isSelected = selectedSession?.dramaId === session.dramaId;
            const isDeleting = deletingId === session.dramaId;
            console.log('[SessionTabs] Rendering session:', session.name, 'dramaId:', session.dramaId, 'length:', session.dramaId?.length);

            return (
              <div
                key={session.dramaId}
                className={`session-tab-item ${isSelected ? 'selected' : ''} ${isDeleting ? 'deleting' : ''}`}
                onClick={() => selectSession(session)}
                title={session.name}
              >
                <span className={`session-tab-status ${session.status === 'running' ? 'pulse' : ''}`}>
                  {config.icon}
                </span>
                <span className="session-tab-name">{session.name}</span>
                <button
                  type="button"
                  className="session-tab-delete"
                  onClick={(e) => handleDelete(e, session.dramaId)}
                  disabled={isDeleting}
                  title="Delete session"
                  aria-label={`Delete session ${session.name}`}
                >
                  {isDeleting ? '...' : '×'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
