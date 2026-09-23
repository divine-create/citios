const fs = require('fs');

let c = fs.readFileSync('app/actions/commerce.ts', 'utf-8');

const bad = `    // Check product stock availability
    if (!product.isWeighed && product.stockQuantity < item.qty) {
      if (product.stockQuantity <= 0) {
        throw new Error(\`"\${product.name}" is currently out of stock.\`);
      }
      throw new Error(\`Only \${product.stockQuantity} item(s) left in stock for "\${product.name}".\`);
    }`;

const good = `    // Check product stock availability
    if (input.locationId) {
      const loc = await db.orm.public.Location.where({ id: input.locationId, organizationId: product.organizationId }).all().first();
      if (!loc) throw new Error("Location not found or invalid for this product");
      
      const locStock = await db.orm.public.RetailLocationStock.where({ locationId: input.locationId, productId: item.productId }).all().first();
      if (!product.isWeighed && (!locStock || locStock.stockQuantity < item.qty)) {
        throw new Error(\`Only \${locStock?.stockQuantity || 0} item(s) left in stock for "\${product.name}".\`);
      }
    } else {
      if (!product.isWeighed && product.stockQuantity < item.qty) {
        if (product.stockQuantity <= 0) {
          throw new Error(\`"\${product.name}" is currently out of stock.\`);
        }
        throw new Error(\`Only \${product.stockQuantity} item(s) left in stock for "\${product.name}".\`);
      }
    }`;

c = c.replace(bad, good);

fs.writeFileSync('app/actions/commerce.ts', c, 'utf-8');
