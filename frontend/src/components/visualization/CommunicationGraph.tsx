import { useState, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  MarkerType,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { socketService } from '../../lib/socket.js';
import './visualization.css';

interface CommunicationGraphProps {
  isPaused: boolean;
}

interface MessageData {
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

function CommunicationGraphInner({ isPaused }: CommunicationGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const handleMessageReceived = (data: unknown) => {
      if (isPaused) return;

      const message = data as MessageData;

      // Update graph with message flow
      // Add sender and receiver as nodes if they don't exist
      setNodes(prevNodes => {
        const newNodes = [...prevNodes];
        if (!newNodes.find(node => node.id === message.from)) {
          newNodes.push({
            id: message.from,
            type: 'input',
            position: { x: 250, y: newNodes.length * 100 },
            data: { label: message.from },
          });
        }
        if (!newNodes.find(node => node.id === message.to)) {
          newNodes.push({
            id: message.to,
            type: 'output',
            position: { x: 750, y: newNodes.length * 100 },
            data: { label: message.to },
          });
        }
        return newNodes;
      });

      // Add edge for communication
      setEdges(prevEdges => {
        const existingEdge = prevEdges.find(
          edge => edge.source === message.from && edge.target === message.to
        );
        if (!existingEdge) {
          return addEdge({
            id: `edge-${message.from}-${message.to}`,
            source: message.from,
            target: message.to,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            label: 'message',
          }, prevEdges);
        }
        return prevEdges;
      });
    };

    socketService.on('message:received', handleMessageReceived);
    return () => socketService.off('message:received', handleMessageReceived);
  }, [isPaused, setNodes, setEdges]);

  return (
    <div className="communication-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="graph-container"
      >
        <Background />
        <Controls />
        <MiniMap />
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
