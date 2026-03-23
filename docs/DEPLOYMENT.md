# Deployment Guide / 部署指南

This guide provides step-by-step instructions for deploying the Multi-Agent Drama System to production.

本文档提供将多智能体戏剧系统部署到生产环境的分步指南。

## Table of Contents / 目录

- [Prerequisites / 前置要求](#prerequisites--前置要求)
- [Pre-Deployment Checklist / 部署前检查清单](#pre-deployment-checklist--部署前检查清单)
- [Deployment Steps / 部署步骤](#deployment-steps--部署步骤)
- [Post-Deployment Verification / 部署后验证](#post-deployment-verification--部署后验证)
- [Rollback Procedure / 回滚流程](#rollback-procedure--回滚流程)
- [Monitoring / 监控](#monitoring--监控)
- [Data Backup / 数据备份](#data-backup--数据备份)
- [Troubleshooting / 故障排查](#troubleshooting--故障排查)

---

## Prerequisites / 前置要求

### Software Requirements / 软件要求

- **Node.js**: >= 18.x (recommended 20.x LTS)
- **npm**: >= 9.x (recommended 10.x)
- **Git**: >= 2.x
- **PM2** (optional, for process management): `npm install -g pm2`
- **Nginx** (optional, for reverse proxy): Nginx >= 1.20

### Hardware Requirements / 硬件要求

- **CPU**: 2 cores minimum (4+ recommended)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Disk**: 10GB minimum (50GB+ recommended for data)
- **Network**: Stable internet connection for LLM API access

### Service Requirements / 服务要求

- **OpenAI API** or **Anthropic API** account (if not using Mock provider)
- **Domain name** (optional, for production)

---

## Pre-Deployment Checklist / 部署前检查清单

### Code & Build / 代码和构建

- [ ] All 104 backend tests pass: `npm test`
- [ ] Frontend builds successfully: `cd frontend && npm run build`
- [ ] Documentation site builds: `npm run docs:build`
- [ ] No TypeScript errors: `npm run build`
- [ ] No ESLint errors (if configured)
- [ ] Version updated to v1.2.0 in `package.json`
- [ ] Version updated to v1.2.0 in `frontend/package.json`
- [ ] CHANGELOG.md is updated

### Configuration / 配置

- [ ] `.env.example` is complete and up-to-date
- [ ] Production `.env` file created with correct values:
  - [ ] `JWT_SECRET` (32+ characters, randomly generated)
  - [ ] `LLM_PROVIDER` set to `openai` or `anthropic` (not `mock`)
  - [ ] API keys for LLM provider configured
  - [ ] `LOG_LEVEL` set to `warn` or `error`
  - [ ] `PORT` and `SOCKET_PORT` configured correctly
- [ ] `frontend/.env` configured:
  - [ ] `VITE_API_BASE_URL` set to production URL
  - [ ] `VITE_SOCKET_URL` set to production URL
- [ ] `.env` is in `.gitignore`

### Documentation / 文档

- [ ] README.md is updated with v1.2 features
- [ ] Configuration guide (`docs/CONFIGURATION.md`) is complete
- [ ] UAT checklist (`docs/V1.2-UAT-CHECKLIST.md`) is ready
- [ ] Deployment documentation is reviewed

### Security / 安全

- [ ] API keys are stored securely
- [ ] JWT_SECRET is strong and randomly generated
- [ ] Firewall rules configured (if needed)
- [ ] SSL/TLS certificates obtained (if using HTTPS)
- [ ] No secrets committed to git

---

## Deployment Steps / 部署步骤

### Step 1: Prepare Server / 准备服务器

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Verify installation
node --version  # Should be v20.x
npm --version   # Should be v10.x
pm2 --version
```

### Step 2: Clone Repository / 克隆仓库

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/abchbx/drama.git
cd drama

# Verify version
git describe --tags  # Should show v1.2.0
```

### Step 3: Install Dependencies / 安装依赖

```bash
# Install backend dependencies
npm ci --production

# Install frontend dependencies
cd frontend
npm ci
cd ..

# Verify installation
npm list --depth=0
```

### Step 4: Configure Environment / 配置环境

```bash
# Copy example .env file
cp .env.example .env

# Edit production .env
nano .env
```

**Production `.env` example:**

```env
# Server
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=warn

# JWT (Use strong random secret)
JWT_SECRET=<generate-with-openssl-rand-hex-32>
JWT_EXPIRES_IN=1h

# LLM Provider (Use real API)
LLM_PROVIDER=openai
OPENAI_API_KEY=<your-production-api-key>
OPENAI_MODEL=gpt-4-turbo
OPENAI_BASE_URL=https://api.openai.com/v1

# Blackboard
BLACKBOARD_DATA_DIR=./data
CORE_LAYER_TOKEN_BUDGET=2048
SCENARIO_LAYER_TOKEN_BUDGET=8192
SEMANTIC_LAYER_TOKEN_BUDGET=16384
PROCEDURAL_LAYER_TOKEN_BUDGET=4096

# Routing
HEARTBEAT_INTERVAL_MS=5000
ACTOR_TIMEOUT_MS=30000
ACTOR_RETRY_TIMEOUT_MS=15000
SOCKET_GRACE_PERIOD_MS=10000
SCENE_TIMEOUT_MS=300000

# Capabilities
CAPABILITY_ACTOR=semantic,procedural
CAPABILITY_DIRECTOR=core,scenario,semantic,procedural
CAPABILITY_ADMIN=core,scenario,semantic,procedural
```

**Frontend `frontend/.env` example:**

```env
VITE_API_BASE_URL=https://your-domain.com
VITE_SOCKET_URL=https://your-domain.com
VITE_SOCKET_RECONNECTION_ATTEMPTS=5
VITE_SOCKET_RECONNECTION_DELAY_MS=1000
VITE_SOCKET_TIMEOUT_MS=5000
```

### Step 5: Build Frontend / 构建前端

```bash
# Build frontend
cd frontend
npm run build

# Verify build output
ls -la dist/
cd ..
```

### Step 6: Build Documentation / 构建文档

```bash
# Build documentation site
npm run docs:build

# Verify build output
ls -la docs-site/.vitepress/dist/
```

### Step 7: Create Data Directory / 创建数据目录

```bash
# Create data directory
sudo mkdir -p /opt/drama/data
sudo chown -R $USER:$USER /opt/drama/data

# Set permissions
chmod 755 /opt/drama/data
```

### Step 8: Start Application with PM2 / 使用 PM2 启动应用

```bash
# Start application with PM2
pm2 start dist/index.js --name drama-backend --env production

# Check status
pm2 status

# View logs
pm2 logs drama-backend

# Set up PM2 to start on boot
pm2 startup
pm2 save
```

### Step 9: Configure Reverse Proxy (Nginx) / 配置反向代理

**Install Nginx:**

```bash
sudo apt install -y nginx
```

**Create Nginx config:**

```bash
sudo nano /etc/nginx/sites-available/drama
```

**Nginx configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /opt/drama/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Documentation site
    location /docs {
        alias /opt/drama/docs-site/.vitepress/dist;
        try_files $uri $uri/ /docs/index.html;
    }

    # Logging
    access_log /var/log/nginx/drama_access.log;
    error_log /var/log/nginx/drama_error.log;
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/drama /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 10: Configure SSL/TLS (Let's Encrypt) / 配置 SSL

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

### Step 11: Configure Firewall / 配置防火墙

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Post-Deployment Verification / 部署后验证

### Service Health Check / 服务健康检查

```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs drama-backend --lines 50

# Check backend health
curl https://your-domain.com/api/health

# Check frontend
curl -I https://your-domain.com/

# Check documentation
curl -I https://your-domain.com/docs/
```

### Functional Verification / 功能验证

- [ ] Access frontend at `https://your-domain.com`
- [ ] Verify connection status is green (connected)
- [ ] Create a test session
- [ ] Configure LLM provider (use test API key)
- [ ] Start a scene
- [ ] Verify real-time visualization works
- [ ] Stop scene
- [ ] Export script (JSON format)
- [ ] Verify export downloads successfully
- [ ] Check documentation site at `https://your-domain.com/docs`
- [ ] Verify search works

### Performance Verification / 性能验证

- [ ] Monitor CPU usage with `htop` or PM2 monitor
- [ ] Monitor memory usage with `free -m`
- [ ] Check response time: `time curl https://your-domain.com/api/health`
- [ ] Verify no excessive log output (LOG_LEVEL=warn)

### Log Monitoring / 日志监控

```bash
# Backend logs
pm2 logs drama-backend --nostream

# Nginx logs
sudo tail -f /var/log/nginx/drama_access.log
sudo tail -f /var/log/nginx/drama_error.log

# System logs
sudo journalctl -u nginx -f
```

---

## Rollback Procedure / 回滚流程

If deployment fails, follow these steps to rollback to v1.1.0:

如果部署失败,按照以下步骤回滚到 v1.1.0:

### Step 1: Stop Current Version / 停止当前版本

```bash
# Stop PM2 process
pm2 stop drama-backend
pm2 delete drama-backend
```

### Step 2: Checkout Previous Version / 检出上一个版本

```bash
cd /opt/drama
git fetch origin
git checkout v1.1.0
```

### Step 3: Rebuild / 重新构建

```bash
# Install dependencies
npm ci --production
cd frontend
npm ci
npm run build
cd ..

# Build documentation
npm run docs:build
```

### Step 4: Restart / 重新启动

```bash
# Start with PM2
pm2 start dist/index.js --name drama-backend --env production

# Verify status
pm2 status
pm2 logs drama-backend
```

### Step 5: Verify / 验证

```bash
# Check health
curl https://your-domain.com/api/health

# Check frontend
curl -I https://your-domain.com/
```

---

## Monitoring / 监控

### PM2 Monitoring / PM2 监控

```bash
# Real-time monitoring
pm2 monit

# View process details
pm2 show drama-backend

# View logs
pm2 logs drama-backend --lines 100
```

### System Monitoring / 系统监控

```bash
# CPU and memory
htop

# Disk usage
df -h

# Network connections
netstat -tulpn

# Process status
ps aux | grep node
```

### Log Management / 日志管理

```bash
# PM2 logs
pm2 flush

# Log rotation (configure in PM2 ecosystem file)
pm2 install pm2-logrotate
```

**PM2 ecosystem file (`ecosystem.config.js`):**

```javascript
module.exports = {
  apps: [{
    name: 'drama-backend',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

---

## Data Backup / 数据备份

### Manual Backup / 手动备份

```bash
# Create backup directory
sudo mkdir -p /opt/drama-backup/$(date +%Y%m%d)

# Backup data directory
sudo cp -r /opt/drama/data /opt/drama-backup/$(date +%Y%m%d)/

# Backup configuration
sudo cp /opt/drama/.env /opt/drama-backup/$(date +%Y%m%d)/

# Keep backups for 7 days
find /opt/drama-backup -mtime +7 -type d -exec rm -rf {} \;
```

### Automated Backup / 自动备份

**Create backup script (`/opt/scripts/backup-drama.sh`):**

```bash
#!/bin/bash

BACKUP_DIR="/opt/drama-backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

mkdir -p "$BACKUP_PATH"

# Backup data
cp -r /opt/drama/data "$BACKUP_PATH/"

# Backup config
cp /opt/drama/.env "$BACKUP_PATH/"

# Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_PATH"
```

**Add to crontab:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/scripts/backup-drama.sh >> /var/log/drama-backup.log 2>&1
```

---

## Troubleshooting / 故障排查

### Application Won't Start / 应用无法启动

**Problem:** PM2 process keeps restarting.

**问题:** PM2 进程不断重启。

**Solution:**

**解决:**

```bash
# Check logs
pm2 logs drama-backend --lines 100

# Common issues:
# 1. Port already in use
sudo lsof -i :3000

# 2. Missing dependencies
npm ci

# 3. Environment variable issues
cat .env

# 4. Permission issues
sudo chown -R $USER:$USER /opt/drama/data
```

### Socket.IO Connection Issues / Socket.IO 连接问题

**Problem:** Frontend can't connect to Socket.IO.

**问题:** 前端无法连接到 Socket.IO。

**Solution:**

**解决:**

```bash
# Check Nginx config
sudo nginx -t

# Check Socket.IO port
sudo lsof -i :3001

# Check firewall
sudo ufw status

# Verify frontend .env
cat frontend/.env
```

### High Memory Usage / 内存使用过高

**Problem:** Node.js process consuming too much memory.

**问题:** Node.js 进程消耗过多内存。

**Solution:**

**解决:**

```bash
# Check memory usage
pm2 show drama-backend

# Reduce memory budgets in .env
CORE_LAYER_TOKEN_BUDGET=1024
SCENARIO_LAYER_TOKEN_BUDGET=4096

# Restart process
pm2 restart drama-backend
```

### Slow Performance / 性能缓慢

**Problem:** Slow response times.

**问题:** 响应时间慢。

**Solution:**

**解决:**

```bash
# Check system resources
htop
df -h

# Check network latency
ping api.openai.com

# Increase timeouts in .env
ACTOR_TIMEOUT_MS=60000
SCENE_TIMEOUT_MS=600000
```

---

## Additional Resources / 其他资源

- [Configuration Guide](./CONFIGURATION.md) - Detailed configuration instructions
- [UAT Checklist](./V1.2-UAT-CHECKLIST.md) - User acceptance testing
- [CHANGELOG.md](../CHANGELOG.md) - Version history and changes
- [API Documentation](./API.md) - API reference

---

For support or questions, please refer to the [main README](../README.md) or open an issue on GitHub.

如有支持需求或问题,请参阅 [主 README](../README.md) 或在 GitHub 上提 issue。
