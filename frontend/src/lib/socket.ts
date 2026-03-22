import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface SocketConfig {
  url: string;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
}

type ConnectionStatusListener = (status: ConnectionStatus, error?: string) => void;
type GenericEventListener = (data: unknown) => void;

const SOCKET_CONFIG_DEFAULTS: SocketConfig = {
  url: import.meta.env.VITE_SOCKET_URL || window.location.origin,
  reconnectionAttempts: Number(import.meta.env.VITE_SOCKET_RECONNECTION_ATTEMPTS) || 5,
  reconnectionDelay: Number(import.meta.env.VITE_SOCKET_RECONNECTION_DELAY_MS) || 1000,
  timeout: Number(import.meta.env.VITE_SOCKET_TIMEOUT_MS) || 5000,
};

export class SocketService {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private status: ConnectionStatus = 'disconnected';
  private listeners: Map<string, Set<GenericEventListener>> = new Map();
  private connectionStatusListeners: Set<ConnectionStatusListener> = new Set();

  constructor(config?: Partial<SocketConfig>) {
    this.config = { ...SOCKET_CONFIG_DEFAULTS, ...config };
  }

  private emitConnectionState(status: ConnectionStatus, error?: string): void {
    this.status = status;
    for (const listener of this.connectionStatusListeners) {
      listener(status, error);
    }
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('[SocketService] Already connected, skipping');
      return;
    }

    console.log('[SocketService] Connecting to:', this.config.url);

    this.emitConnectionState('connecting');

    this.socket = io(this.config.url, {
      reconnection: true,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected successfully');
      this.emitConnectionState('connected');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[SocketService] Disconnected:', reason);
      this.emitConnectionState('disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[SocketService] Connect error:', error);
      this.emitConnectionState('disconnected', error.message);
    });

    this.socket.on('reconnect_attempt', () => {
      console.log('[SocketService] Reconnecting...');
      this.emitConnectionState('reconnecting');
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('[SocketService] Reconnected after', attemptNumber, 'attempts');
      this.emitConnectionState('connected');
    });

    this.socket.on('reconnect_error', (error: Error) => {
      console.error('[SocketService] Reconnect error:', error);
      this.emitConnectionState('reconnecting', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketService] Reconnection failed');
      this.emitConnectionState('disconnected', 'Reconnection attempts exhausted');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.emitConnectionState('disconnected');
    }
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onConnectionStatusChange(listener: ConnectionStatusListener): () => void {
    this.connectionStatusListeners.add(listener);
    return () => {
      this.connectionStatusListeners.delete(listener);
    };
  }

  on(event: string, callback: GenericEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
      if (this.socket) {
        this.socket.off(event, callback);
      }
    };
  }

  emit(event: string, data?: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  off(event: string, callback: GenericEventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();
