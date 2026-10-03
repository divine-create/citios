const fs = require('fs');
let content = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

content = content.replace(
  /sku\s+String\?\s+price\s+Float/,
  'sku            String?\n    \n    price          Float\n    compareAtPrice Float?       // Original price before sale'
);

content = content.replace(
  /category\s+RetailCategory\?\s+@relation\(fields:\s+\[categoryId\],\s+references:\s+\[id\]\)\s+orderItems\s+RetailOrderItem\[\]/,
  'category       RetailCategory? @relation(fields: [categoryId], references: [id])\n    \n    parentId       String?\n    parent         RetailProduct?  @relation("ProductVariants", fields: [parentId], references: [id], onDelete: Cascade)\n    variants       RetailProduct[] @relation("ProductVariants")\n    variantName    String?         // e.g. "Size M, Color Red"\n    \n    orderItems     RetailOrderItem[]'
);

fs.writeFileSync('src/prisma/contract.prisma', content);
