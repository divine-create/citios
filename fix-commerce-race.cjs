const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

const oldCode = `               const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).all().first();
               if (!locStock || locStock.stockQuantity < verifiedItem.quantity) {
                   throw new Error(\`Insufficient stock for item at this location.\`);
               }
               const nextStock = locStock.stockQuantity - verifiedItem.quantity;
               await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).update({ stockQuantity: nextStock });`;

const newCode = `               const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).all().first();
               if (!locStock) {
                   throw new Error(\`Insufficient stock for item at this location.\`);
               }
               const plan = db.raw.sql\`
                   UPDATE "retailLocationStock"
                   SET "stockQuantity" = "stockQuantity" - \${verifiedItem.quantity}
                   WHERE id = \${locStock.id} AND "stockQuantity" >= \${verifiedItem.quantity}
                   RETURNING "stockQuantity"
               \`.returnsRow({ stockQuantity: 'int4' }).build();
               const updated = await tx.execute(plan);
               if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0)) {
                   throw new Error(\`Insufficient stock for item at this location.\`);
               }
               const nextStock = locStock.stockQuantity - verifiedItem.quantity;`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('app/actions/commerce.ts', content);
