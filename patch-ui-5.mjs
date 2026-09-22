import fs from 'fs';

let pos = fs.readFileSync('components/retail/POSTerminal.tsx', 'utf8');
pos = pos.replace(
  'export default function POSTerminal({ organizationId, products, shiftId, onOrderComplete }: {',
  'export default function POSTerminal({ organizationId, locationId, products, shiftId, onOrderComplete }: {'
);
pos = pos.replace(
  'products: Product[];\\n  shiftId: string;',
  'locationId?: string | null;\\n  products: Product[];\\n  shiftId: string;'
);
pos = pos.replace(
  'const res = await createOrder({\\n          organizationId,\\n          shiftId,',
  'const res = await createOrder({\\n          organizationId,\\n          locationId,\\n          shiftId,'
);
fs.writeFileSync('components/retail/POSTerminal.tsx', pos);

let inv = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
inv = inv.replace(
  'export default function InventoryManager({ organizationId, products, categories, onChanged, symbol = "$" }: {',
  'export default function InventoryManager({ organizationId, locationId, products, categories, onChanged, symbol = "$" }: {'
);
inv = inv.replace(
  'products: Product[];\\n  categories: Category[];',
  'locationId?: string | null;\\n  products: Product[];\\n  categories: Category[];'
);
fs.writeFileSync('components/retail/InventoryManager.tsx', inv);
console.log('Patched inline types');
