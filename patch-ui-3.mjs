import fs from 'fs';

let contentPos = fs.readFileSync('components/retail/POSTerminal.tsx', 'utf8');

const oldPOSTerminal = /interface POSTerminalProps \{\s*organizationId: string;\s*products: any\[\];\s*shiftId: string;\s*onOrderComplete: \(\) => void;\s*\}/g;
const newPOSTerminal = `interface POSTerminalProps {
  organizationId: string;
  locationId?: string | null;
  products: any[];
  shiftId: string;
  onOrderComplete: () => void;
}`;

// Use string replacement for flexibility if regex fails
const startPos = contentPos.indexOf('interface POSTerminalProps {');
const endPos = contentPos.indexOf('}', startPos);
contentPos = contentPos.substring(0, startPos) + newPOSTerminal + contentPos.substring(endPos + 1);

contentPos = contentPos.replace(
  /export default function POSTerminal\(\{ organizationId, products, shiftId, onOrderComplete \}: POSTerminalProps\) \{/g,
  'export default function POSTerminal({ organizationId, locationId, products, shiftId, onOrderComplete }: POSTerminalProps) {'
);

contentPos = contentPos.replace(
  /await createOrder\(\{\s*organizationId,\s*shiftId,\s*idempotencyKey/g,
  'await createOrder({\\n      organizationId,\\n      locationId,\\n      shiftId,\\n      idempotencyKey'
);

fs.writeFileSync('components/retail/POSTerminal.tsx', contentPos);

let contentInv = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
const startInv = contentInv.indexOf('interface InventoryManagerProps {');
const endInv = contentInv.indexOf('}', startInv);

const newInv = `interface InventoryManagerProps {
  organizationId: string;
  locationId?: string | null;
  products: any[];
  categories: any[];
  onChanged: () => void;
  symbol?: string;
}`;
contentInv = contentInv.substring(0, startInv) + newInv + contentInv.substring(endInv + 1);

contentInv = contentInv.replace(
  /export default function InventoryManager\(\{ organizationId, products, categories, onChanged, symbol = "\\$" \}: InventoryManagerProps\) \{/g,
  'export default function InventoryManager({ organizationId, locationId, products, categories, onChanged, symbol = "$" }: InventoryManagerProps) {'
);

contentInv = contentInv.replace(
  /const res = await adjustStock\(item\.id, qty, reason\);/g,
  'const res = await adjustStock(item.id, qty, reason, locationId ?? undefined);'
);

fs.writeFileSync('components/retail/InventoryManager.tsx', contentInv);
console.log('Fixed UI props');
