import fs from "fs";
let s = fs.readFileSync("lib/actions/retail.ts", "utf8");

// Fix adjustStock to use atomic SQL and focus on RetailLocationStock
s = s.replace(
  `        if (loc) {
          const stock = await getOrInitLocationStock(tx, product.organizationId, loc.id, productId);
          const next = stock.stockQuantity + delta;
          if (next < 0) throw new Error('Stock cannot go below zero.');
          await tx.orm.public.RetailLocationStock.where({ id: stock.id }).update({ stockQuantity: next });
          await tx.orm.public.RetailStockMovement.create({
            organizationId: current.organizationId,
            locationId: loc.id,
            productId,
            delta,
            beforeQty: stock.stockQuantity,
            afterQty: next,
            reason: 'ADJUSTMENT',
            note: note ?? null,
            recordedById: membership.id,
          });
        } else {
          await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });
          await tx.orm.public.RetailStockMovement.create({
            organizationId: current.organizationId,
            productId,
            delta,
            beforeQty: current.stockQuantity,
            afterQty: next,
            reason: 'ADJUSTMENT',
            note: note ?? null,
            recordedById: membership.id,
          });
        }`,
  `        if (!loc) throw new Error('Location is required for inventory operations.');
        const stock = await getOrInitLocationStock(tx, product.organizationId, loc.id, productId);
        
        // Atomic update
        const updated = await tx.sql\`
          UPDATE "RetailLocationStock"
          SET "stockQuantity" = "stockQuantity" + \${delta}
          WHERE id = \${stock.id} AND "stockQuantity" + \${delta} >= 0
          RETURNING "stockQuantity"
        \`;
        
        if (!updated || updated.length === 0) {
          throw new Error('Stock cannot go below zero or concurrent modification occurred.');
        }

        await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          locationId: loc.id,
          productId,
          delta,
          beforeQty: stock.stockQuantity,
          afterQty: updated[0].stockQuantity,
          reason: 'ADJUSTMENT',
          note: note ?? null,
          recordedById: membership.id,
        });`
);

fs.writeFileSync("lib/actions/retail.ts", s);
