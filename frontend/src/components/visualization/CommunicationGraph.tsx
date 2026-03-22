import { useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Handle,
  Position,
  MarkerType,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { socketService } from '../../lib/socket';
import type { RoutingMessage } from '../../lib/types';
import './visualization.css';

interface CommunicationGraphProps {
  isPaused: boolean;
}

interface MessageNodeData {
  name: string;
  role: string;
  messageCount: number;
  lastMessage?: string;
}

// Custom node component for displaying agent communication
function MessageNode({ data }: { data: MessageNodeData }) {
  const { name, role, messageCount, lastMessage } = data;

  return (
    <div className="message-node">
      <Handle type="target" position={Position.Top} />
      <div className="message-node-header">
        <div className="message-node-icon">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="message-node-info">
          <div className="message-node-name">{name}</div>
          <div className="message-node-role">{role}</div>
        </div>
      </div>
      <div className="message-node-stats">
        <div className="message-node-count">
          <span className="count-value">{messageCount}</span>
          <span className="count-label">messages</span>
        </div>
        {lastMessage && (
          <div className="message-node-preview" title={lastMessage}>
            {lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  messageNode: MessageNode,
};

interface AgentInfo {
  name: string;
  role: string;
  messageCount: number;
  lastMessage?: string;
}

// Helper to determine agent role from message payload
function getRole(payload: Record<string, unknown>): string {
  if (typeof payload.role === 'string') return payload.role;
  return 'Actor';
}

// Helper to extract message text from payload
function getMessageText(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.text === 'string') return payload.text;
  if (typeof payload.content === 'string') return payload.content;
  return undefined;
}

function CommunicationGraphInner({ isPaused }: CommunicationGraphProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<MessageNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track agent information by ID
  const agentInfoRef = useRef<Map<string, AgentInfo>>(new Map());

  // Get position for new nodes (arrange in a circle)
  const getNodePosition = useCallback((_agentId: string, existingCount: number) => {
    const radius = 200;
    const angle = (existingCount * 2 * Math.PI) / 10; // Distribute in circle
    const x = 400 + radius * Math.cos(angle) - 75;
    const y = 300 + radius * Math.sin(angle) - 50;
    return { x, y };
  }, []);

  // Process incoming message and update graph
  const handleMessageReceived = useCallback((data: unknown) => {
    if (isPaused) return;

    const message = data as RoutingMessage;
    const { from, to, payload } = message;

    // Get or create sender node
    const senderRole = getRole(payload);
    const senderText = getMessageText(payload);

    if (!agentInfoRef.current.has(from)) {
      const position = getNodePosition(from, agentInfoRef.current.size);
      agentInfoRef.current.set(from, {
        name: from,
        role: senderRole,
        messageCount: 0,
      });
      setNodes((nds) => [
        ...nds,
        {
          id: from,
          type: 'messageNode',
          position,
          data: agentInfoRef.current.get(from)!,
        },
      ]);
    }

    // Update sender info
    const senderInfo = agentInfoRef.current.get(from)!;
    senderInfo.messageCount++;
    if (senderText) senderInfo.lastMessage = senderText;

    // Update sender node
    setNodes((nds) =>
      nds.map((node) =>
        node.id === from
          ? { ...node, data: { ...senderInfo } }
          : node
      )
    );

    // Process each recipient
    to.forEach((recipient) => {
      // Get or create recipient node
      if (!agentInfoRef.current.has(recipient)) {
        const position = getNodePosition(recipient, agentInfoRef.current.size);
        agentInfoRef.current.set(recipient, {
          name: recipient,
          role: 'Actor',
          messageCount: 0,
        });
        setNodes((nds) => [
          ...nds,
          {
            id: recipient,
            type: 'messageNode',
            position,
            data: agentInfoRef.current.get(recipient)!,
          },
        ]);
      }

      // Update recipient info
      const recipientInfo = agentInfoRef.current.get(recipient)!;
      recipientInfo.messageCount++;

      // Update recipient node
      setNodes((nds) =>
        nds.map((node) =>
          node.id === recipient
            ? { ...node, data: { ...recipientInfo } }
            : node
        )
      );

      // Create or update edge between sender and recipient
      const edgeId = `edge-${from}-${recipient}`;
      setEdges((eds) => {
        const existingEdge = eds.find((e) => e.id === edgeId);
        if (existingEdge) {
          // Update edge to show as recent (animated)
          return eds.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  animated: true,
                }
              : e
          );
        }
        // Create new edge
        return [
          ...eds,
          {
            id: edgeId,
            source: from,
            target: recipient,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
            style: { stroke: '#6b7280', strokeWidth: 2 },
          },
        ];
      });
    });
  }, [isPaused, getNodePosition, setNodes, setEdges]);

  // Listen to Socket.IO messages
  useEffect(() => {
    socketService.on('message:received', handleMessageReceived);
    return () => {
      socketService.off('message:received', handleMessageReceived);
    };
  }, [handleMessageReceived]);

  // Handle edge connections (for interactive use)
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const edgeId = `edge-${params.source}-${params.target}`;
      const newEdge: Edge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
        style: { stroke: '#6b7280', strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);
    },
    [setEdges]
  );

  return (
    <div className="communication-graph" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="communication-graph-flow"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export function CommunicationGraph({ isPaused }: CommunicationGraphProps) {
  return (
    <ReactFlowProvider>
      <CommunicationGraphInner isPaused={isPaused} />
    </ReactFlowProvider>
  );
}
