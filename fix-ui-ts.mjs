import fs from 'fs';

// 1. Fix ProductDetail.tsx
let pd = fs.readFileSync('components/cityos/ProductDetail.tsx', 'utf8');
pd = pd.replace(
  `setSelectedVariantId(prod.variants[0].id);`,
  `setSelectedVariantId(prod.variants[0].id as string);`
);
fs.writeFileSync('components/cityos/ProductDetail.tsx', pd);

// 2. Fix InventoryManager.tsx
let im = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
im = im.replace(
  `unit: p.unit,`,
  `unit: p.unit,\n      compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",\n      variants: p.variants ?? [],`
);
fs.writeFileSync('components/retail/InventoryManager.tsx', im);

// 3. Fix ShopDashboard.tsx
let sd = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
sd = sd.replace(
  `import { getCityMartProduct } from '@/app/actions/commerce';`,
  `import { getCityMartProduct } from '@/app/actions/commerce';\nimport { cancelOrder, refundOrder } from '@/lib/actions/retail';`
);
sd = sd.replace(
  `dashboard.orders.map(o => o.id === id`,
  `dashboard.orders.map((o: any) => o.id === id`
);
sd = sd.replace(
  `dashboard.orders.map(o => o.id === id`,
  `dashboard.orders.map((o: any) => o.id === id`
);
fs.writeFileSync('components/retail/ShopDashboard.tsx', sd);
