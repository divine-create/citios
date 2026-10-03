const fs = require('fs');

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

schema = schema.replace(
  /model CustomerData \{[\s\S]*?\}/,
  `model CustomerData {
  id             String  @id @default(dbgenerated("uuid_generate_v7()"))
  personId       String? @unique
  relationshipId String?
  loyaltyPoints  Float   @default(0)
  notes          String?
  orders         RetailOrder[]
  restaurantOrders RestaurantOrder[]
}`
);

schema = schema.replace(
  /model DeliveryJob \{[\s\S]*?\}/,
  `model DeliveryJob {
  id                String  @id @default(dbgenerated("uuid_generate_v7()"))
  organizationId    String?
  retailOrderId     String? @unique
  retailOrder       RetailOrder? @relation(fields: [retailOrderId], references: [id])
  restaurantOrderId String? @unique
  restaurantOrder   RestaurantOrder? @relation(fields: [restaurantOrderId], references: [id])
  status            String  @default("PENDING")
  pickupAddress     String?
  deliveryAddress   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now())
}`
);

if (!schema.includes('delivery       DeliveryJob?')) {
  schema = schema.replace(
    /refundReason   String\?/,
    `refundReason   String?
  delivery       DeliveryJob?`
  );
}

if (!schema.includes('variants       RetailProduct[]')) {
  schema = schema.replace(
    /categoryId     String\?\r?\n\s*category       RetailCategory\? @relation\(fields: \[categoryId\], references: \[id\]\)/,
    `categoryId     String?
  category       RetailCategory? @relation(fields: [categoryId], references: [id])
  parentId       String?
  parent         RetailProduct? @relation("ProductVariants", fields: [parentId], references: [id], onDelete: Cascade)
  variants       RetailProduct[] @relation("ProductVariants")
  variantName    String?`
  );
}

if (!schema.includes('compareAtPrice')) {
  schema = schema.replace(
    /price          Float/,
    `price          Float
  compareAtPrice Float?`
  );
}

fs.writeFileSync('src/prisma/contract.prisma', schema);
