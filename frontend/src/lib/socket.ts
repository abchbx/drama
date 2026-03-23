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

// CloudStudio HTTPS 环境处理：
// 空字符串时使用 window.location.origin，让 CloudStudio 代理转发到后端
const viteSocketUrl = import.meta.env.VITE_SOCKET_URL;
const socketUrl = viteSocketUrl === '' || viteSocketUrl === undefined 
  ? window.location.origin 
  : viteSocketUrl;

const SOCKET_CONFIG_DEFAULTS: SocketConfig = {
  url: socketUrl,
  path: import.meta.env.VITE_SOCKET_PATH || '/socket.io/',
  reconnectionAttempts: Number(import.meta.env.VITE_SOCKET_RECONNECTION_ATTEMPTS) || 5,
  reconnectionDelay: Number(import.meta.env.VITE_SOCKET_RECONNECTION_DELAY_MS) || 1000,
  timeout: Number(import.meta.env.VITE_SOCKET_TIMEOUT_MS) || 10000, // 增加到 10 秒
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
    console.log('[SocketService] Emitting connection state:', status, error);
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

    const socketOptions: any = {
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      timeout: this.config.timeout,
      // CloudStudio HTTPS 代理环境：强制只使用 polling，禁用 WebSocket 避免混合内容问题
      transports: ['polling'],
      upgrade: false,
    };

    console.log('[SocketService] Socket options:', {
      url: this.config.url,
      path: socketOptions.path,
      transports: socketOptions.transports,
    });

    console.log('[SocketService] Creating Socket.IO instance...');
    
    // 诊断信息：检查常见连接问题
    if (window.location.protocol === 'https:' && this.config.url.startsWith('http:')) {
      console.warn('[SocketService] ⚠️ 协议不匹配：页面是 HTTPS，但 Socket 使用 HTTP，可能导致连接失败');
    }

    // Add clientType to identify as dashboard client
    const enhancedOptions = {
      ...socketOptions,
      auth: {
        clientType: 'dashboard',
      },
    };

    this.socket = io(this.config.url, enhancedOptions);

    this.socket.on('connect', () => {
      console.log('[SocketService] ✅ Connected successfully, socket id:', this.socket?.id);
      this.emitConnectionState('connected');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[SocketService] ❌ Disconnected:', reason);
      this.emitConnectionState('disconnected');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[SocketService] ❌ Connect error:', error.message);
      console.error('[SocketService] Error details:', error);
      
      // 提供更友好的错误信息
      let userFriendlyError = error.message;
      if (error.message.includes('timeout')) {
        userFriendlyError = '连接超时，请检查：1) 后端服务是否运行 2) 网络连接是否正常';
      } else if (error.message.includes('ECONNREFUSED')) {
        userFriendlyError = '无法连接到服务器，请确认后端服务已启动';
      }
      
      this.emitConnectionState('disconnected', userFriendlyError);
    });

    this.socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`[SocketService] 🔄 Reconnection attempt ${attempt}/${this.config.reconnectionAttempts}`);
      this.emitConnectionState('reconnecting');
    });

    this.socket.on('reconnect', (attempt: number) => {
      console.log(`[SocketService] ✅ Reconnected after ${attempt} attempts`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketService] ❌ Reconnection failed after all attempts');
      this.emitConnectionState('disconnected', 'Reconnection failed');
    });

    // Add ping/pong debugging
    this.socket.io.on('ping', () => {
      console.log('[SocketService] Ping sent');
    });

    this.socket.io.on('pong', (latency: number) => {
      console.log('[SocketService] Pong received, latency:', latency, 'ms');
    });

    // Transport change debugging
    this.socket.io.on('error', (error: Error) => {
      console.error('[SocketService] Transport error:', error);
    });

    this.socket.io.on('reconnect', () => {
      console.log('[SocketService] Engine reconnected');
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
