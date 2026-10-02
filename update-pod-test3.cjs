const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-pod.integration.test.ts', 'utf8');
c = c.replace(/await db\.orm\.public\.Person\.create\(\{ id: personId, email: `test-\${personId}@example\.com` \}\);/g, 
  "await db.orm.public.Person.create({ id: personId, firstName: 'Test', lastName: 'Driver' });");
fs.writeFileSync('lib/actions/logistics-pod.integration.test.ts', c);
