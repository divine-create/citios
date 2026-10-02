const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-pod.integration.test.ts', 'utf8');
c = c.replace(/\/Cannot perform\//g, "/mismatch/");
fs.writeFileSync('lib/actions/logistics-pod.integration.test.ts', c);
