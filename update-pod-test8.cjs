const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-pod.integration.test.ts', 'utf8');
c = c.replace(/await acceptDispatch\(\{ dispatchId: dispatch\.id, providerId, driverProfileId \}\);/g, 
  "console.log('DISPATCH providerId:', dispatch.providerId, 'PARAMS providerId:', providerId); await acceptDispatch({ dispatchId: dispatch.id, providerId, driverProfileId });");
fs.writeFileSync('lib/actions/logistics-pod.integration.test.ts', c);
