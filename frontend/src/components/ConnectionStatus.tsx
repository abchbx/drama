import { useEffect } from 'react';
import { socketService } from '../lib/socket';
import { useAppStore } from '../store/appStore';
import './ConnectionStatus.css';

/**
 * ConnectionStatus - Visual indicator of Socket.IO connection state
 *
 * Shows in a corner of the app with color coding:
 * - Green: connected
 * - Yellow: reconnecting
 * - Red: disconnected
 */
export function ConnectionStatus() {
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);

  useEffect(() => {
    // Subscribe to socket service connection state changes
    const unsubscribe = socketService.onConnectionStatusChange((status, error) => {
      setConnectionStatus(status, error ?? null);
    });

    // Initialize with current status
    setConnectionStatus(socketService.getStatus());

    return () => {
      unsubscribe();
    };
  }, [setConnectionStatus]);

  // Map status to display properties
  const getStatusProps = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'green',
          title: 'Connected',
          label: 'Connected',
        };
      case 'reconnecting':
        return {
          color: 'yellow',
          title: 'Reconnecting...',
          label: 'Reconnecting',
        };
      case 'connecting':
        return {
          color: 'yellow',
          title: 'Connecting...',
          label: 'Connecting',
        };
      case 'disconnected':
      default:
        return {
          color: 'red',
          title: 'Disconnected - attempting reconnect',
          label: 'Offline',
        };
    }
  };

  const { color, title, label } = getStatusProps();

  return (
    <div
      className={`connection-status connection-status--${color}`}
      title={title}
      aria-label="Connection status"
      role="status"
    >
      <span className="connection-status__indicator" />
      <span className="connection-status__label">{label}</span>
    </div>
  );
}
