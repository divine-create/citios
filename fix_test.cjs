const fs = require('fs');
let c = fs.readFileSync('lib/voice/intelligence/intelligence.test.ts', 'utf8');
c = "import * as ordersModule from '@/app/actions/orders';\nimport * as serviceModule from '@/app/actions/service';\n" + c;
c = c.replace(/test\('Voice Intelligence Engine', async \(t\) => \{/, "test.mock.method(ordersModule, 'fetchMyOrders', async () => ({ retail: [], restaurant: [] }));\ntest.mock.method(serviceModule, 'fetchMyServiceJobs', async () => ({ jobs: [] }));\n\ntest('Voice Intelligence Engine', async (t) => {");
fs.writeFileSync('lib/voice/intelligence/intelligence.test.ts', c);
