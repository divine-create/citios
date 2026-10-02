const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-pod.integration.test.ts', 'utf8');
c = c.replace(/status: 'ACTIVE'/g, "status: 'ONLINE'");
fs.writeFileSync('lib/actions/logistics-pod.integration.test.ts', c);
