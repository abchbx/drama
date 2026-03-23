import { io, Socket } from 'socket.io-client';

/**
 * Socket.IO Debug Utility
 * Provides detailed logging and diagnostics for Socket.IO connection issues
 */

export interface SocketDebugInfo {
  environment: {
    viteSocketUrl: string | undefined;
    viteApiBaseUrl: string | undefined;
    windowLocationOrigin: string;
    windowLocationProtocol: string;
    windowLocationHost: string;
  };
  connection: {
    attempts: number;
    errors: Array<{ time: string; error: string; details: any }>;
    lastConnected: number | null;
    lastDisconnected: number | null;
  };
  socket: {
    id: string | null;
    connected: boolean;
    transport: string | null;
  };
}

export class SocketDebugger {
  private static instance: SocketDebugger;
  private socket: Socket | null = null;
  private connectionAttempts = 0;
  private errors: Array<{ time: string; error: string; details: any }> = [];

  private constructor() {}

  static getInstance(): SocketDebugger {
    if (!SocketDebugger.instance) {
      SocketDebugger.instance = new SocketDebugger();
    }
    return SocketDebugger.instance;
  }

  getEnvironmentInfo() {
    return {
      viteSocketUrl: import.meta.env.VITE_SOCKET_URL,
      viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      windowLocationOrigin: window.location.origin,
      windowLocationProtocol: window.location.protocol,
      windowLocationHost: window.location.host,
    };
  }

  log(message: string, data?: any) {
    console.log(`[SocketDebugger] ${message}`, data || '');
  }

  logError(message: string, error: any) {
    console.error(`[SocketDebugger] ${message}`, error);
    this.errors.push({
      time: new Date().toISOString(),
      error: message,
      details: error,
    });
  }

  testConnection(url: string): Promise<SocketDebugInfo> {
    return new Promise((resolve) => {
      this.log('Starting connection test', { url });

      const socket = io(url, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 5000,
      });

      this.socket = socket;
      this.connectionAttempts++;

      const timeout = setTimeout(() => {
        this.logError('Connection timeout', { url, timeout: 5000 });
        socket.disconnect();
        resolve(this.getDebugInfo());
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        this.log('Connection successful', {
          id: socket.id,
          transport: socket.io.engine.transport.name,
        });

        setTimeout(() => {
          socket.disconnect();
          resolve(this.getDebugInfo());
        }, 1000);
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.logError('Connection error', { url, error: error.message, details: error });
        socket.disconnect();
        resolve(this.getDebugInfo());
      });
    });
  }

  getDebugInfo(): SocketDebugInfo {
    return {
      environment: this.getEnvironmentInfo(),
      connection: {
        attempts: this.connectionAttempts,
        errors: this.errors,
        lastConnected: this.socket?.connected ? Date.now() : null,
        lastDisconnected: this.socket?.connected ? null : Date.now(),
      },
      socket: {
        id: this.socket?.id || null,
        connected: this.socket?.connected || false,
        transport: this.socket?.io.engine?.transport?.name || null,
      },
    };
  }

  printDiagnostics() {
    const info = this.getDebugInfo();
    console.group('🔍 Socket.IO Diagnostics');
    console.log('Environment:', info.environment);
    console.log('Connection:', info.connection);
    console.log('Socket:', info.socket);

    if (info.connection.errors.length > 0) {
      console.group('❌ Errors');
      info.connection.errors.forEach((err, i) => {
        console.error(`Error ${i + 1}:`, err);
      });
      console.groupEnd();
    }

    console.groupEnd();
    return info;
  }
}

export const socketDebugger = SocketDebugger.getInstance();

// Auto-run diagnostics on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('🔧 Running Socket.IO diagnostics...');
    socketDebugger.printDiagnostics();
  }, 1000);
}
