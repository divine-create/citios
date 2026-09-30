async function run() {
  const token = process.env.ASSEMBLYAI_API_KEY || 'mock-assemblyai-key-for-local-testing';
  const personId = '8f9d3649-823e-4c5b-8ffd-ce6ff507f0cd';

  const res = await fetch('http://localhost:3000/api/voice/tools', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      residentId: personId,
      tool: 'search_restaurants',
      args: { query: '' }
    })
  });

  const text = await res.text();
  console.log('HTTP Status:', res.status);
  console.log('Response:', text);
}
run();
