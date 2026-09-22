import fs from 'fs';

let pos = fs.readFileSync('components/retail/POSTerminal.tsx', 'utf8');
pos = pos.replace(
  'export default function POSTerminal({ organizationId, products, shiftId, onOrderComplete }: {',
  'export default function POSTerminal({ organizationId, locationId, products, shiftId, onOrderComplete }: {'
);
pos = pos.replace(
  '  organizationId: string;\n  products: Product[];',
  '  organizationId: string;\n  locationId?: string | null;\n  products: Product[];'
);
pos = pos.replace(
  /await createOrder\(\{\s*organizationId,\s*shiftId,/g,
  'await createOrder({\n          organizationId,\n          locationId,\n          shiftId,'
);
fs.writeFileSync('components/retail/POSTerminal.tsx', pos);

let inv = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
inv = inv.replace(
  'export default function InventoryManager({ organizationId, products, categories, onChanged, symbol = "$" }: {',
  'export default function InventoryManager({ organizationId, locationId, products, categories, onChanged, symbol = "$" }: {'
);
inv = inv.replace(
  '  organizationId: string;\n  products: Product[];',
  '  organizationId: string;\n  locationId?: string | null;\n  products: Product[];'
);
inv = inv.replace(
  /adjustStock\(item\.id, qty, reason\)/g,
  'adjustStock(item.id, qty, reason, locationId ?? null)'
);
fs.writeFileSync('components/retail/InventoryManager.tsx', inv);
console.log('Patched inline types carefully');
