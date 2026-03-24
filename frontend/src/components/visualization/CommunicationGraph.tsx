import { useEffect, useCallback, useRef, useState } from 'react';
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
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { socketService } from '../../lib/socket';
import { useAppStore } from '../../store/appStore';
import type { RoutingMessage } from '../../lib/types';
import './visualization.css';

import type { VisualizationFilters } from './VisualizationControls';

interface CommunicationGraphProps {
  isPaused: boolean;
  filters: VisualizationFilters;
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

// Helper to determine agent role from message payload or agentId
function getRole(payload: Record<string, unknown>, agentId?: string): string {
  // First try to get from agentId (more reliable)
  if (agentId) {
    if (agentId.startsWith('director-')) return 'Director';
    if (agentId.startsWith('actor-')) return 'Actor';
  }
  // Fallback to payload (which contains character name, not role type)
  if (typeof payload.role === 'string') {
    // If role looks like a character name (contains spaces or numbers), treat as Actor
    if (payload.role.match(/\d/)) return 'Actor';
    return payload.role;
  }
  return 'Actor';
}

// Helper to extract message text from payload
function getMessageText(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.text === 'string') return payload.text;
  if (typeof payload.content === 'string') return payload.content;
  return undefined;
}

function CommunicationGraphInner({ isPaused, filters }: CommunicationGraphProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<MessageNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track agent information by ID
  const agentInfoRef = useRef<Map<string, AgentInfo>>(new Map());

  // Get messages from store to rebuild graph on mount
  const messages = useAppStore(state => state.messages);

  // Get position for new nodes (arrange in a circle)
  const getNodePosition = useCallback((_agentId: string, existingCount: number) => {
    const radius = 200;
    const angle = (existingCount * 2 * Math.PI) / 10; // Distribute in circle
    const x = 400 + radius * Math.cos(angle) - 75;
    const y = 300 + radius * Math.sin(angle) - 50;
    return { x, y };
  }, []);

  // Process incoming message and update graph
  // Apply filters to nodes
  useEffect(() => {
    const allAgents = Array.from(agentInfoRef.current.entries());
    const filteredIds = new Set<string>();

    allAgents.forEach(([agentId, info]) => {
      // Check role case-insensitively (backend sends lowercase)
      const isDirector = info.role.toLowerCase() === 'director';
      if (isDirector && !filters.showDirector) return;
      if (!isDirector && !filters.showActors) return;
      filteredIds.add(agentId); // Use agentId, not name
    });

    setNodes((nds) =>
      nds.filter((node) => filteredIds.has(node.id))
    );

    setEdges((eds) =>
      eds.filter((e) => filteredIds.has(e.source) && filteredIds.has(e.target))
    );
  }, [filters, setNodes, setEdges]);

  const handleMessageReceived = useCallback((data: unknown) => {
    if (isPaused) return;

    const message = data as RoutingMessage;
    const { from, to, payload } = message;

    // Get role from agentId (more reliable than payload.role which is character name)
    const senderRole = getRole(payload, from);

    // Skip dialogue-type messages if filter is off
    if (!filters.showDialogues && ['dialogue', 'reaction'].includes(message.type)) return;
    // Skip director messages if filter is off
    if (!filters.showDirector && senderRole === 'Director') return;
    // Skip actor messages if filter is off
    if (!filters.showActors && senderRole !== 'Director') return;

    const senderText = getMessageText(payload);
    // Use character name from payload if available, otherwise use agentId
    const senderName = typeof payload.role === 'string' ? payload.role : from;

    if (!agentInfoRef.current.has(from)) {
      const position = getNodePosition(from, agentInfoRef.current.size);
      agentInfoRef.current.set(from, {
        name: senderName,
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
    // Update name if we got a better one from payload
    if (typeof payload.role === 'string' && senderInfo.name === from) {
      senderInfo.name = payload.role;
    }

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
        const recipientRole = recipient.startsWith('director-') ? 'Director' : 'Actor';
        agentInfoRef.current.set(recipient, {
          name: recipient,
          role: recipientRole,
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
          return eds.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  animated: true,
                }
              : e
          );
        }
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
  }, [isPaused, filters, getNodePosition, setNodes, setEdges]);

  // Initialize graph from stored messages when component mounts
  useEffect(() => {
    if (isInitialized || messages.length === 0) return;
    
    console.log('[CommunicationGraph] Initializing graph from', messages.length, 'stored messages');
    
    // Clear existing state
    agentInfoRef.current.clear();
    const newNodes: Node<MessageNodeData>[] = [];
    const newEdges: Edge[] = [];
    const processedAgents = new Set<string>();
    
    // Process all stored messages to rebuild the graph
    messages.forEach((message, index) => {
      const { from, to, payload, type } = message;
      
      // Get role from agentId
      const senderRole = getRole(payload, from);
      const senderText = getMessageText(payload);
      const senderName = typeof payload.role === 'string' ? payload.role : from;
      
      // Check filters
      if (!filters.showDialogues && ['dialogue', 'reaction'].includes(type)) return;
      if (!filters.showDirector && senderRole === 'Director') return;
      if (!filters.showActors && senderRole !== 'Director') return;
      
      // Process sender
      if (!processedAgents.has(from)) {
        processedAgents.add(from);
        const position = getNodePosition(from, processedAgents.size - 1);
        const agentInfo: AgentInfo = {
          name: senderName,
          role: senderRole,
          messageCount: 0,
        };
        agentInfoRef.current.set(from, agentInfo);
        newNodes.push({
          id: from,
          type: 'messageNode',
          position,
          data: agentInfo,
        });
      }
      
      // Update sender message count
      const senderInfo = agentInfoRef.current.get(from)!;
      senderInfo.messageCount++;
      if (senderText) senderInfo.lastMessage = senderText;
      
      // Process recipients
      to.forEach((recipient) => {
        if (!processedAgents.has(recipient)) {
          processedAgents.add(recipient);
          const position = getNodePosition(recipient, processedAgents.size - 1);
          const recipientRole = recipient.startsWith('director-') ? 'Director' : 'Actor';
          const recipientInfo: AgentInfo = {
            name: recipient,
            role: recipientRole,
            messageCount: 0,
          };
          agentInfoRef.current.set(recipient, recipientInfo);
          newNodes.push({
            id: recipient,
            type: 'messageNode',
            position,
            data: recipientInfo,
          });
        }
        
        // Update recipient message count
        const recipientInfo = agentInfoRef.current.get(recipient)!;
        recipientInfo.messageCount++;
        
        // Create edge
        const edgeId = `edge-${from}-${recipient}`;
        if (!newEdges.find(e => e.id === edgeId)) {
          newEdges.push({
            id: edgeId,
            source: from,
            target: recipient,
            animated: index === messages.length - 1, // Animate only the last message
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
            style: { stroke: '#6b7280', strokeWidth: 2 },
          });
        }
      });
    });
    
    setNodes(newNodes);
    setEdges(newEdges);
    setIsInitialized(true);
    console.log('[CommunicationGraph] Graph initialized with', newNodes.length, 'nodes and', newEdges.length, 'edges');
  }, [messages, filters, getNodePosition, isInitialized, setNodes, setEdges]);

  // Listen to new Socket.IO messages
  useEffect(() => {
    console.log('[CommunicationGraph] Setting up message:received listener');
    const unsubscribe = socketService.on('message:received', (data) => {
      console.log('[CommunicationGraph] Received new message:', data);
      handleMessageReceived(data);
    });
    return () => {
      console.log('[CommunicationGraph] Cleaning up message:received listener');
      unsubscribe();
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

export function CommunicationGraph({ isPaused, filters }: CommunicationGraphProps) {
  return (
    <ReactFlowProvider>
      <CommunicationGraphInner isPaused={isPaused} filters={filters} />
    </ReactFlowProvider>
  );
}
