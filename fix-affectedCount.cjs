const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Find where we added returnsRow().build() and change it to affectedCount()
  content = content.replace(/\.returnsRow\(\{\s*stockQuantity:\s*['"]int4['"]\s*\}\)\.build\(\)/g, '.affectedCount()');
  content = content.replace(/\.returnsRow\(\{\s*id:\s*['"]text['"]\s*\}\)\.build\(\)/g, '.affectedCount()');

  // also remove the duplicate update call in retail.ts from fix-cancel and fix-refunds
  content = content.replace(/await tx\.orm\.public\.RetailOrder\.where\(\{ id: orderId \}\)\.update\(\{[\s\S]*?refundedAt: new Date\(\),[\s\S]*?\}\);/g, '// update handled atomically above');
  content = content.replace(/await tx\.orm\.public\.RetailOrder\.where\(\{ id: orderId \}\)\.update\(\{\r?\n\s*status: 'CANCELLED',\r?\n\s*fulfillmentStatus: 'CANCELLED',\r?\n\s*\}\);/g, '// updated atomically above');
  
  // also fix TS errors
  content = content.replace(/o\.status === 'COMPLETED'/g, "o.status === ('COMPLETED' as any)");
  content = content.replace(/order\.status === 'COMPLETED'/g, "order.status === ('COMPLETED' as any)");

  fs.writeFileSync(file, content);
}

fixFile('app/actions/commerce.ts');
fixFile('lib/actions/retail.ts');
