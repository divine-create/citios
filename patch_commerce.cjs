const fs = require('fs');
let code = fs.readFileSync('app/actions/commerce.ts', 'utf8');

const regex = /if \(input\.locationId\) \{\s+const updatedLoc = await tx\.sql`[\s\S]*?RETURNING "id", "stockQuantity"\s+`;[\s\S]*?if \(!updatedLoc \|\| updatedLoc\.length === 0\) \{[\s\S]*?throw new Error\(`Insufficient stock for item at this location\.`\);[\s\S]*?\}[\s\S]*?await tx\.orm\.public\.RetailStockMovement\.create\(\{[\s\S]*?organizationId: orgId,[\s\S]*?locationId: input\.locationId,[\s\S]*?productId: verifiedItem\.productId,[\s\S]*?delta: -verifiedItem\.quantity,[\s\S]*?beforeQty: updatedLoc\[0\]\.stockQuantity \+ verifiedItem\.quantity,[\s\S]*?afterQty: updatedLoc\[0\]\.stockQuantity,[\s\S]*?reason: 'SALE',[\s\S]*?note: `Online Order #\$\{createdOrder\.id\.slice\(0, 8\)\}`,[\s\S]*?\}\);[\s\S]*?\} else \{[\s\S]*?\/\/ Fallback to global stock if no location provided \(legacy\)[\s\S]*?const product = await tx\.orm\.public\.RetailProduct\.where\(\{ id: verifiedItem\.productId \}\)\.all\(\)\.first\(\);[\s\S]*?if \(product && !product\.isWeighed\) \{[\s\S]*?const updatedProd = await tx\.sql`[\s\S]*?UPDATE "RetailProduct"[\s\S]*?RETURNING "stockQuantity"[\s\S]*?`;[\s\S]*?if \(!updatedProd \|\| updatedProd\.length === 0\) \{[\s\S]*?throw new Error\(`Item "\$\{product\.name\}" has insufficient stock\.`\);[\s\S]*?\}[\s\S]*?const nextStock = updatedProd\[0\]\.stockQuantity;[\s\S]*?await tx\.orm\.public\.RetailStockMovement\.create\(\{[\s\S]*?organizationId: orgId,[\s\S]*?productId: verifiedItem\.productId,[\s\S]*?delta: -verifiedItem\.quantity,[\s\S]*?beforeQty: nextStock \+ verifiedItem\.quantity,[\s\S]*?afterQty: nextStock,[\s\S]*?reason: 'SALE',[\s\S]*?note: `Online Order #\$\{createdOrder\.id\.slice\(0, 8\)\}`,[\s\S]*?\}\);[\s\S]*?\}[\s\S]*?\}/g;

const replacement = `if (input.locationId) {
               const locStock = await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).all().first();
               if (!locStock || locStock.stockQuantity < verifiedItem.quantity) {
                   throw new Error(\`Insufficient stock for item at this location.\`);
               }
               const nextStock = locStock.stockQuantity - verifiedItem.quantity;
               await tx.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: verifiedItem.productId }).update({ stockQuantity: nextStock }).all();
               
               await tx.orm.public.RetailStockMovement.create({
                 organizationId: orgId,
                 locationId: input.locationId,
                 productId: verifiedItem.productId,
                 delta: -verifiedItem.quantity,
                 beforeQty: locStock.stockQuantity,
                 afterQty: nextStock,
                 reason: 'SALE',
                 note: \`Online Order #\${createdOrder.id.slice(0, 8)}\`,
               });
            } else {
               const product = await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).all().first();
               if (product && !product.isWeighed) {
                 const nextStock = product.stockQuantity - verifiedItem.quantity;
                 if (nextStock < 0) {
                   throw new Error(\`Item "\${product.name}" has insufficient stock.\`);
                 }
                 await tx.orm.public.RetailProduct.where({ id: verifiedItem.productId }).update({ stockQuantity: nextStock }).all();
                 
                 await tx.orm.public.RetailStockMovement.create({
                   organizationId: orgId,
                   productId: verifiedItem.productId,
                   delta: -verifiedItem.quantity,
                   beforeQty: product.stockQuantity,
                   afterQty: nextStock,
                   reason: 'SALE',
                   note: \`Online Order #\${createdOrder.id.slice(0, 8)}\`,
                 });
               }
            }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('app/actions/commerce.ts', code);
    console.log("Successfully patched commerce.ts");
} else {
    console.log("Regex did not match!");
}
