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
  url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
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
      return;
    }

    this.emitConnectionState('connecting');

    this.socket = io(this.config.url, {
      reconnection: true,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.emitConnectionState('connected');
    });

    this.socket.on('disconnect', () => {
      this.emitConnectionState('disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      this.emitConnectionState('disconnected', error.message);
    });

    this.socket.on('reconnect_attempt', () => {
      this.emitConnectionState('reconnecting');
    });

    this.socket.on('reconnect', () => {
      this.emitConnectionState('connected');
    });

    this.socket.on('reconnect_error', (error: Error) => {
      this.emitConnectionState('reconnecting', error.message);
    });

    this.socket.on('reconnect_failed', () => {
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
}

export const socketService = new SocketService();
