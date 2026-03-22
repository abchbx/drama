import { useState, useEffect } from 'react';
import { socketService } from '../../lib/socket';
import type { RoutingMessage } from '../../lib/types';
import './visualization.css';

interface MessageStreamProps {
  isPaused: boolean;
}

export function MessageStream({ isPaused }: MessageStreamProps) {
  const [messages, setMessages] = useState<RoutingMessage[]>([]);

  useEffect(() => {
    const handleMessageReceived = (data: unknown) => {
      if (isPaused) return;

      const message = data as RoutingMessage;
      setMessages(prev => [...prev, message]);
    };

    socketService.on('message:received', handleMessageReceived);
    return () => socketService.off('message:received', handleMessageReceived);
  }, [isPaused]);

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
        {messages.map((msg, idx) => (
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
