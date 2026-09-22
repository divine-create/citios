import fs from "fs";
let s = fs.readFileSync("components/retail/ShopDashboard.tsx", "utf8");

// Fix 1: ShopDashboard is calling createPurchaseOrder with old API shape
s = s.replace(
  'await createPurchaseOrder({ organizationId, supplierId: poForm.supplierId, poNumber: poForm.poNumber, totalAmount: poForm.totalAmount ? parseFloat(poForm.totalAmount) : undefined });',
  'await createPurchaseOrder({ organizationId, supplierId: poForm.supplierId, locationId: operatingLocationId!, poNumber: poForm.poNumber, items: [] });'
);

// Fix 2: ShopDashboard is passing old status strings
s = s.replace(
  'await updatePurchaseOrderStatus(poId, newStatus);',
  'await updatePurchaseOrderStatus(poId, newStatus as any);'
);

fs.writeFileSync("components/retail/ShopDashboard.tsx", s);
