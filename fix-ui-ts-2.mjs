import fs from 'fs';

let sd = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
if (!sd.includes('import { cancelOrder, refundOrder }')) {
  sd = sd.replace(
    `import React`,
    `import { cancelOrder, refundOrder } from '@/lib/actions/retail';\nimport React`
  );
}
fs.writeFileSync('components/retail/ShopDashboard.tsx', sd);

let im = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
im = im.replace(
  `compareAtPrice: p.compareAtPrice != null`,
  `compareAtPrice: (p as any).compareAtPrice != null`
);
im = im.replace(
  `variants: p.variants ?? []`,
  `variants: (p as any).variants ?? []`
);
fs.writeFileSync('components/retail/InventoryManager.tsx', im);
