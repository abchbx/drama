/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_SOCKET_RECONNECTION_ATTEMPTS: number;
  readonly VITE_SOCKET_RECONNECTION_DELAY_MS: number;
  readonly VITE_SOCKET_TIMEOUT_MS: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
