import fs from 'fs';

let content = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');

// Patch ShiftsTab props
const oldShiftsTab = /function ShiftsTab\(\{ organizationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "\$", setActiveMenu, setSalesShiftFilter \}: \{\s*organizationId: string; registers: any\[\]; openShift: any \| null; currentUserId: string; onChanged: \(\) => void; symbol\?: string; setActiveMenu: \(m: string\) => void; setSalesShiftFilter: \(id: string \| null\) => void;\s*\}\) \{/g;

const newShiftsTab = `function ShiftsTab({ organizationId, locationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "$", setActiveMenu, setSalesShiftFilter }: {
  organizationId: string; locationId?: string | null; registers: any[]; openShift: any | null; currentUserId: string; onChanged: () => void; symbol?: string; setActiveMenu: (m: string) => void; setSalesShiftFilter: (id: string | null) => void;
}) {`;

content = content.replace(oldShiftsTab, newShiftsTab);

// Patch createRegister inside ShiftsTab
content = content.replace(
  /const res = await createRegister\(organizationId, newRegName\);/g,
  'const res = await createRegister(organizationId, newRegName, locationId);'
);

// Patch OpenShiftPrompt props
const oldOpenShiftPrompt = /function OpenShiftPrompt\(\{ organizationId, registers, currentUserId, onOpened, symbol = "\$" \}: \{\s*organizationId: string; registers: any\[\]; currentUserId: string; onOpened: \(\) => void; symbol\?: string;\s*\}\) \{/g;

const newOpenShiftPrompt = `function OpenShiftPrompt({ organizationId, locationId, registers, currentUserId, onOpened, symbol = "$" }: {
  organizationId: string; locationId?: string | null; registers: any[]; currentUserId: string; onOpened: () => void; symbol?: string;
}) {`;

content = content.replace(oldOpenShiftPrompt, newOpenShiftPrompt);

// Patch openShift inside OpenShiftPrompt
content = content.replace(
  /const res = await openShift\(\{ organizationId, registerId, openingFloat: num \}\);/g,
  'const res = await openShift({ organizationId, registerId, openingFloat: num, locationId });'
);

// Patch createRegister inside OpenShiftPrompt
content = content.replace(
  /const res = await createRegister\(organizationId, newRegisterName\);/g,
  'const res = await createRegister(organizationId, newRegisterName, locationId);'
);

// Patch POSTerminal props
const oldPOSTerminal = /interface POSTerminalProps \{\s*organizationId: string;\s*products: any\[\];\s*shiftId: string;\s*onOrderComplete: \(\) => void;\s*\}/g;

const newPOSTerminal = `interface POSTerminalProps {
  organizationId: string;
  locationId?: string | null;
  products: any[];
  shiftId: string;
  onOrderComplete: () => void;
}`;

let contentPos = fs.readFileSync('components/retail/POSTerminal.tsx', 'utf8');
contentPos = contentPos.replace(oldPOSTerminal, newPOSTerminal);

// Patch POSTerminal function signature
contentPos = contentPos.replace(
  /export default function POSTerminal\(\{ organizationId, products, shiftId, onOrderComplete \}: POSTerminalProps\) \{/g,
  'export default function POSTerminal({ organizationId, locationId, products, shiftId, onOrderComplete }: POSTerminalProps) {'
);

// Patch createOrder call in POSTerminal
contentPos = contentPos.replace(
  /await createOrder\(\{\s*organizationId,\s*shiftId,\s*idempotencyKey/g,
  'await createOrder({\n      organizationId,\n      locationId,\n      shiftId,\n      idempotencyKey'
);

// Patch InventoryManager props
const oldInv = /interface InventoryManagerProps \{\s*organizationId: string;\s*products: any\[\];\s*categories: any\[\];\s*onChanged: \(\) => void;\s*symbol\?: string;\s*\}/g;

const newInv = `interface InventoryManagerProps {
  organizationId: string;
  locationId?: string | null;
  products: any[];
  categories: any[];
  onChanged: () => void;
  symbol?: string;
}`;

let contentInv = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
contentInv = contentInv.replace(oldInv, newInv);

contentInv = contentInv.replace(
  /export default function InventoryManager\(\{ organizationId, products, categories, onChanged, symbol = "\$" \}: InventoryManagerProps\) \{/g,
  'export default function InventoryManager({ organizationId, locationId, products, categories, onChanged, symbol = "$" }: InventoryManagerProps) {'
);

contentInv = contentInv.replace(
  /const res = await adjustStock\(item\.id, qty, reason\);/g,
  'const res = await adjustStock(item.id, qty, reason, locationId ?? undefined);'
);

fs.writeFileSync('components/retail/ShopDashboard.tsx', content);
fs.writeFileSync('components/retail/POSTerminal.tsx', contentPos);
fs.writeFileSync('components/retail/InventoryManager.tsx', contentInv);
console.log('Patched component props for location context');
