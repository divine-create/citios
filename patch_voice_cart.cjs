const fs = require('fs');
let code = fs.readFileSync('lib/voice/cart.ts', 'utf8');

code = code.replace(
  ".include('product', (p) => p.select('id', 'name', 'price', 'stockQuantity'))",
  ".include('product', (p) => p.select('id', 'name', 'price', 'stockQuantity', 'organizationId').include('organization', o => o.select('name')))"
);

code = code.replace(
  ".include('menuItem', (m) => m.select('id', 'name', 'price'))",
  ".include('menuItem', (m) => m.select('id', 'name', 'price', 'organizationId').include('organization', o => o.select('name')))"
);

fs.writeFileSync('lib/voice/cart.ts', code);
