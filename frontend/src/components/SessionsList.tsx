import { useEffect } from 'react';
import { useAppStore } from '../store/appStore.js';

const statusColors: Record<string, string> = {
  created: 'bg-gray-400',
  idle: 'bg-gray-400',
  running: 'bg-green-500',
  stopping: 'bg-yellow-500',
  completed: 'bg-blue-500',
  interrupted: 'bg-orange-500',
  failed: 'bg-red-500',
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
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function SessionsList() {
  const { sessions, selectedSession, selectSession, fetchSessions } = useAppStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="sessions-list">
      <div className="sessions-list-header">
        <h2>Sessions</h2>
        <span className="session-count">{sessions.length}</span>
      </div>

      {sessions.length === 0 ? (
        <div className="sessions-empty">
          <p>No sessions yet - create one!</p>
        </div>
      ) : (
        <ul className="sessions-items">
          {sessions.map((session) => (
            <li
              key={session.dramaId}
              className={`session-item ${selectedSession?.dramaId === session.dramaId ? 'selected' : ''}`}
              onClick={() => selectSession(session)}
            >
              <div className="session-info">
                <span className="session-name">{session.name}</span>
                <span className="session-timestamp">{formatTimestamp(session.createdAt)}</span>
              </div>
              <span className={`status-badge ${statusColors[session.status]} ${session.status === 'running' ? 'pulse' : ''}`}>
                {statusLabels[session.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
