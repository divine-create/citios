const fs = require('fs');

function fix() {
  // 1. Fix commerce.ts affectedCount
  let commerce = fs.readFileSync('app/actions/commerce.ts', 'utf8');
  commerce = commerce.replace(
    /\`\.affectedCount\(\);/g,
    `RETURNING "stockQuantity"
    \`.returnsRow({ stockQuantity: 'int4' }).build();`
  );
  // Also we need to fix the check
  // `const updated = await tx.execute(plan);`
  // `if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0) || !updated) {`
  // Actually, returnsRow() will return an array of rows! So `updated.length === 0` will catch it.
  fs.writeFileSync('app/actions/commerce.ts', commerce);

  // 2. Fix retail.ts affectedCount
  let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');
  retail = retail.replace(
    /\`\.affectedCount\(\);/g,
    `RETURNING "id"
    \`.returnsRow({ id: 'text' }).build();`
  );
  // Fix the updated === 0 checks in retail.ts!
  // It returns an array of rows now!
  retail = retail.replace(/if \(updated === 0\)/g, `if (Array.isArray(updated) && updated.length === 0)`);
  retail = retail.replace(/if \(locUpdated === 0\)/g, `if (Array.isArray(locUpdated) && locUpdated.length === 0)`);
  retail = retail.replace(/if \(prodUpdated === 0\)/g, `if (Array.isArray(prodUpdated) && prodUpdated.length === 0)`);
  
  fs.writeFileSync('lib/actions/retail.ts', retail);

  // 3. Fix test TEST_ORG constraint
  let testFile = fs.readFileSync('lib/fulfillment.integration.test.ts', 'utf8');
  testFile = testFile.replace(/organizationId: 'TEST_ORG',/, ``);
  testFile = testFile.replace(/locationId: 'TEST_LOC',/, ``);
  fs.writeFileSync('lib/fulfillment.integration.test.ts', testFile);
}

fix();
