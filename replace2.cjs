const fs = require('fs');
let content = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

content = content.replace(
  'sku            String?\n    \n    price          Float',
  'sku            String?\n    \n    price          Float\n    compareAtPrice Float?       // Original price before sale'
);
content = content.replace(
  'sku            String?\r\n    \r\n    price          Float',
  'sku            String?\r\n    \r\n    price          Float\r\n    compareAtPrice Float?       // Original price before sale'
);

content = content.replace(
  'globalCategory String?\n  \n    categoryId     String?\n    category       RetailCategory? @relation(fields: [categoryId], references: [id])\n    \n    orderItems     RetailOrderItem[]',
  'globalCategory String?\n  \n    categoryId     String?\n    category       RetailCategory? @relation(fields: [categoryId], references: [id])\n    \n    parentId       String?\n    parent         RetailProduct?  @relation("ProductVariants", fields: [parentId], references: [id], onDelete: Cascade)\n    variants       RetailProduct[] @relation("ProductVariants")\n    variantName    String?         // e.g. "Size M, Color Red"\n    \n    orderItems     RetailOrderItem[]'
);
content = content.replace(
  'globalCategory String?\r\n  \r\n    categoryId     String?\r\n    category       RetailCategory? @relation(fields: [categoryId], references: [id])\r\n    \r\n    orderItems     RetailOrderItem[]',
  'globalCategory String?\r\n  \r\n    categoryId     String?\r\n    category       RetailCategory? @relation(fields: [categoryId], references: [id])\r\n    \r\n    parentId       String?\r\n    parent         RetailProduct?  @relation("ProductVariants", fields: [parentId], references: [id], onDelete: Cascade)\r\n    variants       RetailProduct[] @relation("ProductVariants")\r\n    variantName    String?         // e.g. "Size M, Color Red"\r\n    \r\n    orderItems     RetailOrderItem[]'
);

fs.writeFileSync('src/prisma/contract.prisma', content);
