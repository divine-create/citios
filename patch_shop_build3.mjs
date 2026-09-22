import fs from "fs";
let s = fs.readFileSync("components/retail/ShopDashboard.tsx", "utf8");

s = s.replace(
  'await updatePurchaseOrderStatus(po.id, next[po.status] as "DRAFT" | "SENT" | "RECEIVED" | "PARTIAL");',
  'await updatePurchaseOrderStatus(po.id, next[po.status] as any);'
);

fs.writeFileSync("components/retail/ShopDashboard.tsx", s);
