const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-operations.integration.test.ts', 'utf8');

c = c.replace(/completeDelivery\(\{ deliveryJobId: job\.id, providerId, driverProfileId \}\)/g, 
  "completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId, type: 'SIGNATURE', recipientName: 'Jane Doe' })");
c = c.replace(/completeDelivery\(\{ deliveryJobId: job\.id, providerId: provider2Id, driverProfileId \}\)/g, 
  "completeDelivery({ deliveryJobId: job.id, providerId: provider2Id, driverProfileId, type: 'SIGNATURE', recipientName: 'Jane Doe' })");
c = c.replace(/completeDelivery\(\{ deliveryJobId: job\.id, providerId, driverProfileId: driver2ProfileId \}\)/g, 
  "completeDelivery({ deliveryJobId: job.id, providerId, driverProfileId: driver2ProfileId, type: 'SIGNATURE', recipientName: 'Jane Doe' })");

fs.writeFileSync('lib/actions/logistics-operations.integration.test.ts', c);
