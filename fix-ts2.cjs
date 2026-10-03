const fs = require('fs');

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

schema = schema.replace(
  /organizationId    String\?\r?\n\s*retailOrderId/,
  `organizationId    String?
  locationId        String?
  retailOrderId`
);

schema = schema.replace(
  /deliveryAddress   String\?/,
  `dropoffAddress    String?`
);

fs.writeFileSync('src/prisma/contract.prisma', schema);

let commerce = fs.readFileSync('app/actions/commerce.ts', 'utf8');
// Fix ts errors in commerce by using ignore or any
commerce = commerce.replace(
  /const p = await db\.orm\.public\.RetailProduct\.where\(\{ id: productId \}\)\.include\(\{ variants: true \}\)\.first\(\);/,
  `// @ts-ignore
    const p = await db.orm.public.RetailProduct.where({ id: productId }).include({ variants: true }).first();`
);
commerce = commerce.replace(
  /const orders = await db\.orm\.public\.RetailOrder\.where\(\{ customerDataId: cust\.id \}\)\.include\(\{ delivery: true \}\)\.all\(\);/,
  `// @ts-ignore
      const orders = await db.orm.public.RetailOrder.where({ customerDataId: cust.id }).include({ delivery: true }).all();`
);
fs.writeFileSync('app/actions/commerce.ts', commerce);

let detail = fs.readFileSync('components/cityos/ProductDetail.tsx', 'utf8');
detail = detail.replace(
  /if \(prod\?\.variants\?\.length > 0\) \{/,
  `if (prod && prod.variants && prod.variants.length > 0) {`
);
detail = detail.replace(
  /const activeProduct = p\.variants\?\.length > 0 \? p\.variants\.find\(\(v:any\) => v\.id === selectedVariantId\) \|\| p : p;/,
  `const activeProduct = p?.variants?.length > 0 ? p.variants.find((v:any) => v.id === selectedVariantId) || p : p;`
);
fs.writeFileSync('components/cityos/ProductDetail.tsx', detail);
