const fs = require('fs');

function fix() {
  // 1. Fix contract.prisma
  let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');
  schema = schema.replace(/status\s+String\s+@default\("PENDING"\)/, 'status            String  @default("REQUESTED")');
  fs.writeFileSync('src/prisma/contract.prisma', schema);

  // 2. Fix retail.ts
  let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');
  retail = retail.replace(/status: 'PENDING',/g, "status: 'REQUESTED',");
  fs.writeFileSync('lib/actions/retail.ts', retail);

  // 3. Fix fulfillment.integration.test.ts
  let testFile = fs.readFileSync('lib/fulfillment.integration.test.ts', 'utf8');
  testFile = testFile.replace(/assert\.strictEqual\(job\.status, 'PENDING'\);/g, "assert.strictEqual(job.status, 'REQUESTED');");
  fs.writeFileSync('lib/fulfillment.integration.test.ts', testFile);
}

fix();
