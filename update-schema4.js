import fs from 'fs';

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

// Update OrderItem
schema = schema.replace(
  /model OrderItem \{[\s\S]*?notes\s+String\?\s*\/\/\s*Special instructions/,
  match => match + "\n    kitchenStatus  OrderStatus     @default(PENDING) // Added for KDS"
);

// Update RestaurantOrder
schema = schema.replace(
  /model RestaurantOrder \{[\s\S]*?createdAt\s+DateTime\s+@default\(now\(\)\)/,
  match => match.replace(
    /createdAt\s+DateTime\s+@default\(now\(\)\)/,
    "kitchenStartedAt DateTime?\n    kitchenCompletedAt DateTime?\n    createdAt      DateTime     @default(now())"
  )
);

fs.writeFileSync('src/prisma/contract.prisma', schema);
