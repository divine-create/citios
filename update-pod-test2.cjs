const fs = require('fs');
let c = fs.readFileSync('lib/actions/logistics-pod.integration.test.ts', 'utf8');
c = c.replace(/const driverProfileId = generateId\(\);/g, 
  `const personId = generateId();
  await db.orm.public.Person.create({ id: personId, email: \`test-\${personId}@example.com\` });
  const driverProfileId = generateId();`);
c = c.replace(/personId: generateId\(\),/g, 'personId,');
fs.writeFileSync('lib/actions/logistics-pod.integration.test.ts', c);
