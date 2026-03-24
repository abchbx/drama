import { useEffect } from 'react';
import type { Agent } from '../../lib/types.js';
import { socketService } from '../../lib/socket.js';
import { useAppStore } from '../../store/appStore.js';
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
  const agents = useAppStore(state => state.agents);
  const setAgents = useAppStore(state => state.setAgents);
  const updateAgent = useAppStore(state => state.updateAgent);
  const removeAgent = useAppStore(state => state.removeAgent);
  const fetchAgents = useAppStore(state => state.fetchAgents);

  // Fetch agents on mount
  useEffect(() => {
    console.log('[AgentDashboardTab] Fetching agents on mount');
    fetchAgents();
  }, [fetchAgents]);

  // Handle agent events via Socket.IO
  useEffect(() => {
    // agent_updated emits batch data with all connected agents
    const handleAgentUpdated = (data: unknown) => {
      const payload = data as { agents?: Array<{ agentId: string; role: string; socketId: string; lastPong: number }> };
      if (payload.agents && Array.isArray(payload.agents)) {
        // Replace entire agent list with server-side truth
        const mapped: Agent[] = payload.agents.map(a => {
          // Extract a human-readable name from agentId
          // Format: director-{dramaId} or actor-{dramaId}-{number}
          let name: string;
          if (a.agentId.startsWith('director-')) {
            name = 'Director';
          } else if (a.agentId.startsWith('actor-')) {
            // Extract actor number from ID like "actor-{uuid}-1"
            const match = a.agentId.match(/-(\d+)$/);
            const num = match ? match[1] : '';
            name = `Actor ${num}`;
          } else {
            name = a.agentId.substring(0, 8);
          }
          
          return {
            id: a.agentId,
            name,
            role: a.role, // Keep original role from backend (director/actor)
            status: 'connected' as const,
            latency: 0,
            lastHeartbeat: new Date(a.lastPong).toISOString(),
          };
        });
        setAgents(mapped);
      }
    };

    const handleAgentConnected = (data: unknown) => {
      const agent = data as Agent;
      updateAgent({ ...agent, status: 'connected' });
    };

    const handleAgentDisconnected = (data: unknown) => {
      const { id } = data as { id: string };
      removeAgent(id);
    };

    socketService.on('agent_updated', handleAgentUpdated);
    socketService.on('agent_connected', handleAgentConnected);
    socketService.on('agent_disconnected', handleAgentDisconnected);

    return () => {
      socketService.off('agent_updated', handleAgentUpdated);
      socketService.off('agent_connected', handleAgentConnected);
      socketService.off('agent_disconnected', handleAgentDisconnected);
    };
  }, [setAgents, updateAgent, removeAgent]);

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
