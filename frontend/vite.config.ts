import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CloudStudio 环境检测
const isCloudStudio = process.env.CLOUDSTUDIO_APP_ID !== undefined ||
  process.env.WORKSPACE_ID !== undefined ||
  process.env.HOSTNAME?.includes('cloudstudio');

export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_',
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: [
      '5bf7ae4d5e1b42b5a026ccce84537fca--5174.ap-shanghai2.cloudstudio.club',
      '.ap-shanghai2.cloudstudio.club',
      '.cloudstudio.club',
      'localhost',
      '127.0.0.1',
    ],
    cors: true,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // CloudStudio 环境下不代理 socket.io，让前端直接使用当前域名连接
      // 本地开发时启用代理
      ...(isCloudStudio ? {} : {
        '/socket.io': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          ws: true,
        },
      }),
    },
  },
});
