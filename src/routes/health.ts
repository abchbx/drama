import { Router } from 'express';
import type { RouterService } from '../services/router.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const start = Date.now();
  const routerService = req.app.locals.routerService as RouterService | undefined;

  // Get Socket.IO client count
  let socketClients = 0;
  if (routerService?.io) {
    socketClients = routerService.io.sockets.sockets.size;
  }

  // Get system resources (CPU, memory - disk is not applicable for runtime)
  const cpuUsage = process.cpuUsage();
  const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;
  const memoryUsage = process.memoryUsage();
  const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  res.json({
    api: {
      status: 'healthy' as const,
      responseTime: Date.now() - start,
    },
    socketIo: {
      status: routerService ? 'connected' as const : 'disconnected' as const,
      clients: socketClients,
    },
    resources: {
      cpu: Math.round(cpuPercent * 100) / 100,
      memory: Math.round(memoryPercent * 100) / 100,
      disk: 0, // Not applicable for runtime
    },
  });
});
