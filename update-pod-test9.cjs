const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-pod.integration.test.ts', 'utf8');
c = c.replace(/await assignDelivery\(\{ deliveryJobId: job\.id, driverProfileId \}\);/g, 
  "await assignDelivery({ deliveryJobId: job.id, providerId, driverProfileId });");
fs.writeFileSync('lib/actions/logistics-pod.integration.test.ts', c);
