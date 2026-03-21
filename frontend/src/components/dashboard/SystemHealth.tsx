import { useEffect, useState } from 'react';
import type { HealthData } from '../../lib/types.js';
import { apiClient } from '../../lib/api.js';

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
    case 'connected':
      return 'green';
    case 'degraded':
    case 'reconnecting':
      return 'yellow';
    case 'unhealthy':
    case 'disconnected':
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
}

function getStatusBadgeClass(status: string): string {
  const color = getStatusColor(status);
  return `status-badge status-${color}`;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function SystemHealth() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const response = await apiClient.getHealth();
      if (response.success && response.data) {
        setHealthData(response.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="system-health">
        <h3>System Health</h3>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="system-health">
        <h3>System Health</h3>
        <div className="error">Failed to load system health</div>
      </div>
    );
  }

  return (
    <div className="system-health">
      <div className="health-header">
        <h3>System Health</h3>
        {lastUpdated && (
          <span className="last-updated">Updated: {lastUpdated}</span>
        )}
      </div>

      <div className="health-grid">
        {/* API Health */}
        <div className="health-card">
          <div className="health-card-header">
            <h4>API Service</h4>
            <span className={getStatusBadgeClass(healthData.api.status)}>
              {healthData.api.status}
            </span>
          </div>
          <div className="health-details">
            <div className="health-detail">
              <span className="detail-label">Response Time</span>
              <span className="detail-value">{healthData.api.responseTime}ms</span>
            </div>
          </div>
        </div>

        {/* Socket.IO Health */}
        <div className="health-card">
          <div className="health-card-header">
            <h4>Socket.IO</h4>
            <span className={getStatusBadgeClass(healthData.socketIo.status)}>
              {healthData.socketIo.status}
            </span>
          </div>
          <div className="health-details">
            <div className="health-detail">
              <span className="detail-label">Connected Clients</span>
              <span className="detail-value">{healthData.socketIo.clients}</span>
            </div>
          </div>
        </div>

        {/* System Resources */}
        <div className="health-card">
          <div className="health-card-header">
            <h4>System Resources</h4>
            <span className={getStatusBadgeClass(
              healthData.resources.cpu > 0.8 || healthData.resources.memory > 0.8
                ? 'red'
                : healthData.resources.cpu > 0.6 || healthData.resources.memory > 0.6
                ? 'yellow'
                : 'green'
            )}>
              {healthData.resources.cpu > 0.8 || healthData.resources.memory > 0.8
                ? 'High'
                : healthData.resources.cpu > 0.6 || healthData.resources.memory > 0.6
                ? 'Medium'
                : 'Normal'}
            </span>
          </div>
          <div className="health-details">
            <div className="health-detail">
              <span className="detail-label">CPU Usage</span>
              <span className="detail-value">{formatPercentage(healthData.resources.cpu)}</span>
            </div>
            <div className="health-detail">
              <span className="detail-label">Memory Usage</span>
              <span className="detail-value">{formatPercentage(healthData.resources.memory)}</span>
            </div>
            <div className="health-detail">
              <span className="detail-label">Disk Usage</span>
              <span className="detail-value">{formatPercentage(healthData.resources.disk)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
