const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

content = content.replace(
  /const locStock = await tx\.orm\.public\.RetailLocationStock\.where\(\{ locationId: input\.locationId, productId: verifiedItem\.productId \}\)\.all\(\)\.first\(\);\r?\n\s+if \(!locStock \|\| locStock\.stockQuantity < verifiedItem\.quantity\) \{\r?\n\s+throw new Error\(`Insufficient stock for item at this location\.`\);\r?\n\s+\}\r?\n\s+const nextStock = locStock\.stockQuantity - verifiedItem\.quantity;\r?\n\s+await tx\.orm\.public\.RetailLocationStock\.where\(\{ locationId: input\.locationId, productId: verifiedItem\.productId \}\)\.update\(\{ stockQuantity: nextStock \}\);/g,
  `const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).all().first();
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
               if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0) || !updated) {
                   throw new Error(\`Insufficient stock for item at this location.\`);
               }
               const nextStock = locStock.stockQuantity - verifiedItem.quantity;`
);

content = content.replace(
  /const product = await tx\.orm\.public\.RetailProduct\.where\(\{ id: verifiedItem\.productId \}\)\.all\(\)\.first\(\);\r?\n\s+if \(product && !product\.isWeighed\) \{\r?\n\s+const nextStock = product\.stockQuantity - verifiedItem\.quantity;\r?\n\s+if \(nextStock < 0\) \{\r?\n\s+throw new Error\(`Item "\$\{product\.name\}" has insufficient stock\.`\);\r?\n\s+\}\r?\n\s+await tx\.orm\.public\.RetailProduct\.where\(\{ id: verifiedItem\.productId \}\)\.update\(\{ stockQuantity: nextStock \}\);/g,
  `const product = await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).all().first();
               if (product && !product.isWeighed) {
                 const plan = db.raw.sql\`
                   UPDATE "retailProduct"
                   SET "stockQuantity" = "stockQuantity" - \${verifiedItem.quantity}
                   WHERE id = \${product.id} AND "stockQuantity" >= \${verifiedItem.quantity}
                   RETURNING "stockQuantity"
                 \`.returnsRow({ stockQuantity: 'int4' }).build();
                 const updated = await tx.execute(plan);
                 if ((updated && updated.affectedRows === 0) || (Array.isArray(updated) && updated.length === 0) || !updated) {
                   throw new Error(\`Item "\${product.name}" has insufficient stock.\`);
                 }
                 const nextStock = product.stockQuantity - verifiedItem.quantity;`
);

fs.writeFileSync('app/actions/commerce.ts', content);
