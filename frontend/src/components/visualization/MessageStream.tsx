import { useEffect, useMemo } from 'react';
import { socketService } from '../../lib/socket';
import { useAppStore } from '../../store/appStore';
import type { RoutingMessage } from '../../lib/types';
import type { VisualizationFilters } from './VisualizationControls';
import './visualization.css';

interface MessageStreamProps {
  isPaused: boolean;
  filters: VisualizationFilters;
}

function isDialogueType(type: RoutingMessage['type']): boolean {
  const dialogueTypes = ['dialogue', 'narration', 'reaction', 'scene_start', 'scene_end', 'your_turn', 'fallback'];
  const result = dialogueTypes.includes(type);
  console.log(`[MessageStream] isDialogueType(${type}): ${result}`);
  return result;
}

export function MessageStream({ isPaused, filters }: MessageStreamProps) {
  const messages = useAppStore(state => state.messages);
  const addMessage = useAppStore(state => state.addMessage);

  // Debug: Log current state
  console.log('[MessageStream] Render - messages count:', messages.length, 'isPaused:', isPaused, 'filters:', filters);

  useEffect(() => {
    console.log('[MessageStream] Setting up message:received listener');
    const handleMessageReceived = (data: unknown) => {
      console.log('[MessageStream] Received message:', data);
      if (isPaused) {
        console.log('[MessageStream] Message ignored because isPaused is true');
        return;
      }
      const message = data as RoutingMessage;
      addMessage(message);
    };

    const unsubscribe = socketService.on('message:received', handleMessageReceived);
    return () => {
      console.log('[MessageStream] Cleaning up message:received listener');
      unsubscribe();
    };
  }, [isPaused, addMessage]);

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // Determine role from agentId (msg.from) which is more reliable
      // Director IDs start with 'director-', actor IDs start with 'actor-'
      const agentId = msg.from || '';
      const isDirector = agentId.startsWith('director-');
      const isActor = !isDirector;
      const isDialogue = isDialogueType(msg.type);

      if (!filters.showDirector && isDirector) return false;
      if (!filters.showActors && isActor) return false;
      if (!filters.showDialogues && isDialogue) return false;
      return true;
    });
  }, [messages, filters]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getMessageColor = (role: string | undefined) => {
    return role === 'Director' ? 'var(--primary-color)' : 'var(--success-color)';
  };

  const getRole = (payload: Record<string, unknown>): string => {
    if (typeof payload.role === 'string') return payload.role;
    return 'Actor';
  };

  const getText = (payload: Record<string, unknown>): string => {
    if (typeof payload.text === 'string') return payload.text;
    return JSON.stringify(payload);
  };

  return (
    <div className="message-stream">
      <div className="messages-list">
        {filteredMessages.length === 0 && messages.length > 0 && (
          <div className="message-empty-filtered">All messages filtered out by current filters</div>
        )}
        {messages.length === 0 && (
          <div className="message-empty">No messages yet. Messages will appear here when the scene generates dialogue.</div>
        )}
        {filteredMessages.map((msg, idx) => (
          <div key={`${msg.id}-${idx}`} className="message-item">
            <div className="message-timestamp">
              {formatTime(msg.timestamp)}
            </div>
            <div
              className="message-content"
              style={{ borderLeftColor: getMessageColor(msg.payload.role as string | undefined) }}
            >
              <div className="message-sender">
                {msg.from} ({getRole(msg.payload)})
              </div>
              <div className="message-text">{getText(msg.payload)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
