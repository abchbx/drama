import { useState, useEffect } from 'react';
import type { Agent } from '../../lib/types.js';
import { socketService } from '../../lib/socket.js';
import { SystemHealth } from './SystemHealth.js';
import { AgentGraph } from './AgentGraph.js';
import './dashboard.css';

function getStatusColor(status: string): string {
  switch (status) {
    case 'connected':
    case 'active':
      return 'green';
    case 'idle':
    case 'thinking':
      return 'yellow';
    case 'disconnected':
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}

function getStatusBadgeClass(status: string): string {
  const color = getStatusColor(status);
  return `status-badge status-${color}`;
}

export function AgentDashboardTab() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'director-1',
      name: 'Director',
      role: 'Director',
      status: 'connected',
      latency: 45,
      lastHeartbeat: new Date().toISOString(),
    },
    {
      id: 'actor-1',
      name: 'Romeo',
      role: 'Actor',
      status: 'active',
      latency: 62,
      lastHeartbeat: new Date().toISOString(),
    },
    {
      id: 'actor-2',
      name: 'Juliet',
      role: 'Actor',
      status: 'idle',
      latency: 58,
      lastHeartbeat: new Date().toISOString(),
    },
  ]);

  // Handle agent events via Socket.IO
  useEffect(() => {
    const handleAgentConnected = (data: unknown) => {
      const agent = data as Agent;
      setAgents(prev => {
        const existing = prev.find(a => a.id === agent.id);
        if (existing) {
          return prev.map(a => a.id === agent.id ? agent : a);
        }
        return [...prev, agent];
      });
    };

    const handleAgentDisconnected = (data: unknown) => {
      const { id } = data as { id: string };
      setAgents(prev =>
        prev.map(a =>
          a.id === id ? { ...a, status: 'disconnected' } : a
        )
      );
    };

    const handleAgentUpdated = (data: unknown) => {
      const agent = data as Agent;
      setAgents(prev =>
        prev.map(a => a.id === agent.id ? { ...a, ...agent } : a)
      );
    };

    socketService.on('agent_connected', handleAgentConnected);
    socketService.on('agent_disconnected', handleAgentDisconnected);
    socketService.on('agent_updated', handleAgentUpdated);

    return () => {
      socketService.off('agent_connected', handleAgentConnected);
      socketService.off('agent_disconnected', handleAgentDisconnected);
      socketService.off('agent_updated', handleAgentUpdated);
    };
  }, []);

  return (
    <div className="tab-content agent-dashboard-tab">
      <div className="tab-header">
        <h2>Agent Dashboard</h2>
        <p>Real-time agent status and system health</p>
      </div>

      <div className="dashboard-layout">
        {/* System Health Section */}
        <section className="health-section">
          <SystemHealth />
        </section>

        {/* Agents List Section */}
        <section className="agents-section">
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
                    <span className={getStatusBadgeClass(agent.status)}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="agent-stats">
                    <div className="stat-item">
                      <span className="stat-label">Latency</span>
                      <span className="stat-value">{agent.latency}ms</span>
                    </div>
                    {agent.lastHeartbeat && (
                      <div className="stat-item">
                        <span className="stat-label">Last Heartbeat</span>
                        <span className="stat-value">
                          {new Date(agent.lastHeartbeat).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Agent Graph Section */}
        <section className="graph-section">
          <div className="communication-panel">
            <h3>Agent Communication Graph</h3>
            <AgentGraph />
          </div>
        </section>
      </div>
    </div>
  );
}
