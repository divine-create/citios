const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

const oldCode2 = `               const product = await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).all().first();
               if (product && !product.isWeighed) {
                 const nextStock = product.stockQuantity - verifiedItem.quantity;
                 if (nextStock < 0) {
                   throw new Error(\`Item "\${product.name}" has insufficient stock.\`);
                 }
                 await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).update({ stockQuantity: nextStock });`;

const newCode2 = `               const product = await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).all().first();
               if (product && !product.isWeighed) {
                 const plan = db.raw.sql\`
                   UPDATE "retailProduct"
                   SET "stockQuantity" = "stockQuantity" - \${verifiedItem.quantity}
                   WHERE id = \${product.id} AND "stockQuantity" >= \${verifiedItem.quantity}
                   RETURNING "stockQuantity"
                 \`.returnsRow({ stockQuantity: 'int4' }).build();
                 const updated = await tx.execute(plan);
                 if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0)) {
                   throw new Error(\`Item "\${product.name}" has insufficient stock.\`);
                 }
                 const nextStock = product.stockQuantity - verifiedItem.quantity;`;

content = content.replace(oldCode2, newCode2);
fs.writeFileSync('app/actions/commerce.ts', content);
