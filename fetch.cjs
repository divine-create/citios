const http = require('https');
http.get('https://citios.vercel.app/workspaces/restaurantos/d8755209-7699-4cab-a5f4-a8c6b3c62af3/pos', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('Body snippet:', data.substring(0, 300)));
});
