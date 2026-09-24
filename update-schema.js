import fs from 'fs';
let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

// 1. Add kitchenStatus to OrderItem
schema = schema.replace(
  '    notes          String?         // Special instructions',
  `    notes          String?         // Special instructions
    kitchenStatus  OrderStatus     @default(PENDING) // Added for KDS item-level readiness`
);

// 2. Add timestamps to RestaurantOrder
schema = schema.replace(
  '    createdAt      DateTime     @default(now())',
  `    kitchenStartedAt   DateTime?
    kitchenCompletedAt DateTime?
    createdAt      DateTime     @default(now())`
);

fs.writeFileSync('src/prisma/contract.prisma', schema);
