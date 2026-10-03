import fs from 'fs';

let sd = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
// Remove duplicate import at the top
sd = sd.replace(`import { cancelOrder, refundOrder } from '@/lib/actions/retail';\n`, '');
// Add cancelOrder to line 68 where getOrders is
sd = sd.replace(`getOrders, refundOrder,`, `getOrders, refundOrder, cancelOrder,`);

// Fix cancelOrder call
sd = sd.replace(`await cancelOrder(id);`, `await cancelOrder(id, { reason: 'Merchant requested' });`);

fs.writeFileSync('components/retail/ShopDashboard.tsx', sd);

let im = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
im = im.replace(`String(p.compareAtPrice)`, `String((p as any).compareAtPrice)`);
fs.writeFileSync('components/retail/InventoryManager.tsx', im);
