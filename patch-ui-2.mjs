import fs from 'fs';

let content = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');

const oldSales = /function SalesReturnsTab\(\{ organizationId, currentUserId, onChanged, symbol = "\$", salesShiftFilter, setSalesShiftFilter \}: \{\s*organizationId: string; currentUserId: string; onChanged: \(\) => void; symbol\?: string; salesShiftFilter\?: string \| null; setSalesShiftFilter\?: \(id: string \| null\) => void;\s*\}\) \{/g;

const newSales = `function SalesReturnsTab({ organizationId, locationId, currentUserId, onChanged, symbol = "$", salesShiftFilter, setSalesShiftFilter }: {
  organizationId: string; locationId?: string | null; currentUserId: string; onChanged: () => void; symbol?: string; salesShiftFilter?: string | null; setSalesShiftFilter?: (id: string | null) => void;
}) {`;

content = content.replace(oldSales, newSales);

// In SalesReturnsTab, it fetches orders with getOrders(organizationId). Change to getOrders(organizationId, locationId).
content = content.replace(
  /const rows = await getOrders\(organizationId\);/g,
  'const rows = await getOrders(organizationId, locationId);'
);

fs.writeFileSync('components/retail/ShopDashboard.tsx', content);
console.log('Patched SalesReturnsTab');
