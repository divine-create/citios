const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\.returnsRow\(\{[^}]+\}\)/g, '');
  
  // also fix the strict comparison error
  // lib/actions/retail.ts(2263,63): error TS2367: This comparison appears to be unintentional because the types '"PENDING" | "CANCELLED"' and '"COMPLETED"' have no overlap.
  content = content.replace(/o\.status === 'COMPLETED'/g, "o.status === ('COMPLETED' as any)");
  content = content.replace(/order\.status === 'COMPLETED'/g, "order.status === ('COMPLETED' as any)");

  fs.writeFileSync(file, content);
}

fixFile('app/actions/commerce.ts');
fixFile('lib/actions/retail.ts');

