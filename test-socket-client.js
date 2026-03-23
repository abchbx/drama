#!/usr/bin/env node

/**
 * Test Socket.IO connection from Node.js
 * This simulates what the browser client does
 */

import { io } from 'socket.io-client';

console.log('🔍 Socket.IO Connection Test');
console.log('===========================\n');

const testConfig = [
  {
    name: 'Test 1: Direct connection to localhost:3000',
    url: 'http://localhost:3000',
    path: '/socket.io/',
  },
  {
    name: 'Test 2: Connection via proxy (localhost:5174)',
    url: 'http://localhost:5174',
    path: '/socket.io/',
  },
];

async function testConnection(config) {
  return new Promise((resolve) => {
    console.log(`🧪 ${config.name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Path: ${config.path}`);

    const socket = io(config.url, {
      path: config.path,
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 5000,
    });

    let resolved = false;

    socket.on('connect', () => {
      if (!resolved) {
        resolved = true;
        console.log(`   ✅ Connected! Socket ID: ${socket.id}`);
        console.log(`   Transport: ${socket.io.engine.transport.name}\n`);
        socket.disconnect();
        resolve({ success: true, id: socket.id });
      }
    });

    socket.on('connect_error', (error) => {
      if (!resolved) {
        resolved = true;
        console.log(`   ❌ Connection failed: ${error.message}`);
        console.log(`   Error details:`, error.message, '\n');
        socket.disconnect();
        resolve({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      if (!resolved) {
        resolved = true;
        console.log(`   ⚠️ Disconnected: ${reason}\n`);
        resolve({ success: false, reason });
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log(`   ⏱️ Connection timeout\n`);
        socket.disconnect();
        resolve({ success: false, error: 'timeout' });
      }
    }, 5000);
  });
}

async function runTests() {
  const results = [];

  for (const config of testConfig) {
    const result = await testConnection(config);
    results.push({ ...config, ...result });
  }

  console.log('\n📊 Test Results Summary');
  console.log('======================');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.success ? 'PASSED' : 'FAILED'}`);
    if (!result.success) {
      console.log(`   Reason: ${result.error || result.reason}`);
    }
  });

  const allPassed = results.every((r) => r.success);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'}`);

  if (!allPassed) {
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if backend is running: curl http://localhost:3000/health');
    console.log('2. Check if frontend is running: curl http://localhost:5174/');
    console.log('3. Check Vite proxy configuration in vite.config.ts');
    console.log('4. Check CORS configuration in backend');
    console.log('5. Check environment variables in frontend/.env');
  }

  process.exit(allPassed ? 0 : 1);
}

runTests().catch(console.error);