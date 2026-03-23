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
  const [agents, setAgents] = useState<Agent[]>([]);

  // Handle agent events via Socket.IO
  useEffect(() => {
    // agent_updated emits batch data with all connected agents
    const handleAgentUpdated = (data: unknown) => {
      const payload = data as { agents?: Array<{ agentId: string; role: string; socketId: string; lastPong: number }> };
      if (payload.agents && Array.isArray(payload.agents)) {
        // Replace entire agent list with server-side truth
        const mapped: Agent[] = payload.agents.map(a => ({
          id: a.agentId,
          name: a.agentId.replace(/^(actor|director)-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          role: a.role,
          status: 'connected' as const,
          latency: 0,
          lastHeartbeat: new Date(a.lastPong).toISOString(),
        }));
        setAgents(mapped);
      }
    };

    const handleAgentConnected = (data: unknown) => {
      const agent = data as Agent;
      setAgents(prev => {
        const existing = prev.find(a => a.id === agent.id);
        if (existing) {
          return prev.map(a => a.id === agent.id ? { ...a, ...agent, status: 'connected' } : a);
        }
        return [...prev, { ...agent, status: 'connected' }];
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

    socketService.on('agent_updated', handleAgentUpdated);
    socketService.on('agent_connected', handleAgentConnected);
    socketService.on('agent_disconnected', handleAgentDisconnected);

    return () => {
      socketService.off('agent_updated', handleAgentUpdated);
      socketService.off('agent_connected', handleAgentConnected);
      socketService.off('agent_disconnected', handleAgentDisconnected);
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
            <h3>Connected Agents ({agents.length})</h3>
            {agents.length === 0 ? (
              <div className="agents-empty">
                <p>No agents connected</p>
                <p className="agents-empty-hint">Agents will appear here when they connect via Socket.IO</p>
              </div>
            ) : (
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
            )}
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
