import { useEffect, useCallback, useRef, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Agent } from '../../lib/types.js';
import { socketService } from '../../lib/socket.js';

interface AgentNodeData {
  agent: Agent;
}

function AgentNode({ data }: { data: AgentNodeData }) {
  const { agent } = data;

  const statusColors: Record<string, string> = {
    connected: '#10b981',
    idle: '#f59e0b',
    active: '#3b82f6',
    disconnected: '#ef4444',
    error: '#dc2626',
  };

  const statusColor = statusColors[agent.status] || '#6b7280';

  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} />
      <div className="agent-node-header" style={{ borderColor: statusColor }}>
        <div className="agent-node-icon" style={{ backgroundColor: statusColor }}>
          {agent.role.charAt(0)}
        </div>
        <div className="agent-node-info">
          <div className="agent-node-name">{agent.name}</div>
          <div className="agent-node-role">{agent.role}</div>
        </div>
        <div
          className="agent-node-status-indicator"
          style={{ backgroundColor: statusColor }}
        />
      </div>
      <div className="agent-node-body">
        <div className="agent-node-stat">
          <span className="stat-label">Status</span>
          <span className="stat-value" style={{ color: statusColor }}>
            {agent.status}
          </span>
        </div>
        <div className="agent-node-stat">
          <span className="stat-label">Latency</span>
          <span className="stat-value">{agent.latency}ms</span>
        </div>
        {agent.lastHeartbeat && (
          <div className="agent-node-stat">
            <span className="stat-label">Last Heartbeat</span>
            <span className="stat-value">
              {new Date(agent.lastHeartbeat).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  agentNode: AgentNode,
};

function AgentGraphInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Create nodes from agents
  useEffect(() => {
    const newNodes: Node<AgentNodeData>[] = agents.map((agent, i) => ({
      id: agent.id,
      type: 'agentNode',
      position: {
        x: 200 + (i % 3) * 250,
        y: 100 + Math.floor(i / 3) * 200
      },
      data: { agent },
    }));

    setNodes(newNodes);
  }, [agents, setNodes]);

  // Create edges between director and actors
  useEffect(() => {
    const director = agents.find(a => a.role === 'Director');
    const actors = agents.filter(a => a.role === 'Actor');

    const newEdges: Edge[] = actors.map((actor) => ({
      id: `edge-${director?.id || 'director'}-${actor.id}`,
      source: director?.id || 'director',
      target: actor.id,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#6b7280', strokeWidth: 2 },
    }));

    setEdges(newEdges);
  }, [agents, setEdges]);

  // Handle agent events via Socket.IO
  useEffect(() => {
    // agent_updated emits batch data with all connected agents
    const handleAgentUpdated = (data: unknown) => {
      const payload = data as { agents?: Array<{ agentId: string; role: string; socketId: string; lastPong: number }> };
      if (payload.agents && Array.isArray(payload.agents)) {
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

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="agent-graph" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="agent-graph-flow"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            const agent = n.data.agent as Agent;
            const statusColors: Record<string, string> = {
              connected: '#10b981',
              idle: '#f59e0b',
              active: '#3b82f6',
              disconnected: '#ef4444',
              error: '#dc2626',
            };
            return statusColors[agent.status] || '#6b7280';
          }}
          nodeColor={(n) => {
            const agent = n.data.agent as Agent;
            return agent.role === 'Director' ? '#dbeafe' : '#fef3c7';
          }}
        />
      </ReactFlow>
    </div>
  );
}

export function AgentGraph() {
  return (
    <ReactFlowProvider>
      <AgentGraphInner />
    </ReactFlowProvider>
  );
}
