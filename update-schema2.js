import fs from 'fs';
let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

schema = schema.replace(
  /notes\s+String\?\s*\/\/\s*Special instructions/g,
  "notes          String?         // Special instructions\n    kitchenStatus  OrderStatus     @default(PENDING) // Added for KDS item-level readiness"
);

schema = schema.replace(
  /createdAt\s+DateTime\s+@default\(now\(\)\)/g,
  "kitchenStartedAt   DateTime?\n    kitchenCompletedAt DateTime?\n    createdAt      DateTime     @default(now())"
);

fs.writeFileSync('src/prisma/contract.prisma', schema);
