import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// Add kitchenStatus to enrichOrders mapping
code = code.replace(
  /kitchenStation:\s*menuItems\.find\(\(m\)\s*=>\s*m\.id\s*===\s*i\.menuItemId\)\?\.kitchenStation\s*\?\?\s*'Main Kitchen',/g,
  "kitchenStation: menuItems.find((m) => m.id === i.menuItemId)?.kitchenStation ?? 'Main Kitchen',\n          kitchenStatus: i.kitchenStatus,"
);

// Add timestamps to enrichOrders mapping
code = code.replace(
  /createdAt:\s*o\.createdAt\.toString\s*\?\s*o\.createdAt\.toString\(\)\s*:\s*o\.createdAt,/g,
  "createdAt: o.createdAt.toString ? o.createdAt.toString() : o.createdAt,\n        kitchenStartedAt: o.kitchenStartedAt ? o.kitchenStartedAt.toString() : null,\n        kitchenCompletedAt: o.kitchenCompletedAt ? o.kitchenCompletedAt.toString() : null,"
);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
