// Fix procurement.ts types
import fs from "fs";
let s = fs.readFileSync("lib/actions/procurement.ts", "utf8");

// Fix map casting
s = s.replace('const poItemById = new Map(poItems.map((i: any) => [i.id, i]));', 'const poItemById = new Map(poItems.map((i: any) => [i.id, i as any]));');
s = s.replace('const poItem = poItemById.get(incoming.poItemId);', 'const poItem: any = poItemById.get(incoming.poItemId);');

// Fix locationId nullability
s = s.replace('const stock = await getOrInitLocationStock(tx, po.organizationId, po.locationId, product.id);', 'const stock = await getOrInitLocationStock(tx, po.organizationId, po.locationId!, product.id);');

// Fix update received quantity mapping
s = s.replace('const refreshedItems = await tx.orm.public.RetailPurchaseOrderItem.where({ poId: po.id }).all();', 'const refreshedItems: any[] = await tx.orm.public.RetailPurchaseOrderItem.where({ poId: po.id }).all();');

fs.writeFileSync("lib/actions/procurement.ts", s);
