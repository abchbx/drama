import { useState } from 'react';

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'thinking' | 'error';
  lastActivity: string;
  messageCount: number;
}

export function AgentDashboardTab() {
  const [agents] = useState<AgentStatus[]>([
    {
      id: 'actor-1',
      name: 'Actor: Romeo',
      role: 'Actor',
      status: 'thinking',
      lastActivity: '2 seconds ago',
      messageCount: 15,
    },
    {
      id: 'actor-2',
      name: 'Actor: Juliet',
      role: 'Actor',
      status: 'active',
      lastActivity: '5 seconds ago',
      messageCount: 12,
    },
    {
      id: 'director',
      name: 'Director',
      role: 'Director',
      status: 'idle',
      lastActivity: '10 seconds ago',
      messageCount: 8,
    },
  ]);

  return (
    <div className="tab-content agent-dashboard-tab">
      <div className="tab-header">
        <h2>Agent Dashboard</h2>
        <p>Real-time agent status and communication graph</p>
      </div>

      <div className="dashboard-content">
        <div className="agents-panel">
          <h3>Active Agents ({agents.length})</h3>
          <div className="agent-grid">
            {agents.map((agent) => (
              <div key={agent.id} className="agent-card">
                <div className="agent-header">
                  <div>
                    <h4>{agent.name}</h4>
                    <p className="agent-role">{agent.role}</p>
                  </div>
                  <span className={`status-badge status-${agent.status}`}>
                    {agent.status}
                  </span>
                </div>
                <div className="agent-stats">
                  <div className="stat-item">
                    <span className="stat-label">Last Activity</span>
                    <span className="stat-value">{agent.lastActivity}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Messages Sent</span>
                    <span className="stat-value">{agent.messageCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="communication-panel">
          <h3>Communication Graph</h3>
          <div className="graph-placeholder">
            <p>Communication visualization will appear here</p>
            <div className="graph-skeleton">
              <div className="node node-actor1">Actor 1</div>
              <div className="node node-actor2">Actor 2</div>
              <div className="node node-director">Director</div>
              <div className="edge">→</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
