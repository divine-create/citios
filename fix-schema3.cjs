const fs = require('fs');

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

schema = schema.replace(
  /model CustomerData \{[\s\S]*?\}/,
  `model CustomerData {
  id             String  @id @default(dbgenerated("uuid_generate_v7()"))
  personId       String? @unique
  relationshipId String? @unique
  relationship   Relationship? @relation(fields: [relationshipId], references: [id])
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
    /model RetailOrder \{([\s\S]*?)refundReason\s+String\?([\s\S]*?)\}/,
    `model RetailOrder {$1refundReason   String?
  delivery       DeliveryJob?$2}`
  );
}

if (!schema.includes('variants       RetailProduct[]')) {
  schema = schema.replace(
    /model RetailProduct \{([\s\S]*?)categoryId\s+String\?\r?\n\s*category\s+RetailCategory\?\s+@relation\(fields: \[categoryId\], references: \[id\]\)([\s\S]*?)\}/,
    `model RetailProduct {$1categoryId     String?
  category       RetailCategory? @relation(fields: [categoryId], references: [id])
  parentId       String?
  parent         RetailProduct? @relation("ProductVariants", fields: [parentId], references: [id], onDelete: Cascade)
  variants       RetailProduct[] @relation("ProductVariants")
  variantName    String?$2}`
  );
}

if (!schema.includes('compareAtPrice')) {
  schema = schema.replace(
    /model RetailProduct \{([\s\S]*?)price\s+Float([\s\S]*?)\}/,
    `model RetailProduct {$1price          Float
  compareAtPrice Float?$2}`
  );
}

fs.writeFileSync('src/prisma/contract.prisma', schema);
