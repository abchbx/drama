// Test script to check backend API
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

async function testSessionsAPI() {
  console.log('Testing sessions API...\n');

  // 1. List all sessions
  console.log('1. GET /sessions');
  const listRes = await fetch(`${API_BASE}/sessions`);
  const listData = await listRes.json();
  console.log('Response:', JSON.stringify(listData, null, 2));

  if (listData.sessions && listData.sessions.length > 0) {
    const firstSession = listData.sessions[0];
    console.log('\nFirst session:');
    console.log('  dramaId:', firstSession.dramaId);
    console.log('  name:', firstSession.name);
    console.log('  dramaId type:', typeof firstSession.dramaId);
    console.log('  dramaId length:', firstSession.dramaId?.length);

    // 2. Try to get specific session
    console.log('\n2. GET /sessions/:id');
    const getRes = await fetch(`${API_BASE}/sessions/${encodeURIComponent(firstSession.dramaId)}`);
    const getData = await getRes.json();
    console.log('Response status:', getRes.status);
    console.log('Response:', JSON.stringify(getData, null, 2));

    // 3. Try to delete (this will fail if dramaId is wrong)
    console.log('\n3. DELETE /sessions/:id');
    const deleteRes = await fetch(`${API_BASE}/sessions/${encodeURIComponent(firstSession.dramaId)}`, {
      method: 'DELETE'
    });
    console.log('Response status:', deleteRes.status);
    const deleteData = await deleteRes.json().catch(() => null);
    console.log('Response:', deleteData);

    // 4. List again to verify
    console.log('\n4. GET /sessions (after delete)');
    const listRes2 = await fetch(`${API_BASE}/sessions`);
    const listData2 = await listRes2.json();
    console.log('Sessions count before:', listData.sessions.length);
    console.log('Sessions count after:', listData2.sessions.length);
  }
}

testSessionsAPI().catch(console.error);
