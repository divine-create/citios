import fs from "fs";

let schema = fs.readFileSync("src/prisma/contract.prisma", "utf8");

// Verify the original PO block exists
if (!schema.includes('model RetailPurchaseOrder {')) {
  console.error("ERROR: RetailPurchaseOrder model not found");
  process.exit(1);
}

// Replace the old RetailPurchaseOrder model with expanded version
const oldPO = `model RetailPurchaseOrder {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation("OrgRetailPurchaseOrders", fields: [organizationId], references: [id], onDelete: Cascade)
  
  supplierId     String
  supplier       RetailSupplier @relation(fields: [supplierId], references: [id])
  
  poNumber       String
  status         String       @default("DRAFT") // DRAFT, SENT, RECEIVED, PARTIAL
  
  expectedDate   DateTime?
  totalAmount    Float?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @default(now())
}`;

const newPO = `model RetailPurchaseOrder {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation("OrgRetailPurchaseOrders", fields: [organizationId], references: [id], onDelete: Cascade)

  supplierId     String
  supplier       RetailSupplier @relation(fields: [supplierId], references: [id])

  locationId     String?
  location       Location?    @relation("LocationPurchaseOrders", fields: [locationId], references: [id])

  poNumber       String
  status         String       @default("DRAFT") // DRAFT, SUBMITTED, APPROVED, PARTIAL, RECEIVED, CANCELLED

  notes          String?
  expectedDate   DateTime?
  totalAmount    Float?       // Server-calculated from items

  items          RetailPurchaseOrderItem[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @default(now())

  @@index([organizationId])
}

model RetailPurchaseOrderItem {
  id          String              @id @default(uuid())
  poId        String
  po          RetailPurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)

  productId   String
  product     RetailProduct       @relation("ProductPOItems", fields: [productId], references: [id])

  orderedQty  Float
  receivedQty Float               @default(0)
  unitCost    Float               // Price snapshot at PO creation
  totalCost   Float               // Server-calculated: orderedQty * unitCost

  createdAt   DateTime            @default(now())

  @@index([poId])
}`;

schema = schema.replace(oldPO, newPO);

// Also add Location relation
if (!schema.includes('"LocationPurchaseOrders"')) {
  schema = schema.replace(
    'retailLocations        RetailLocationStock[]',
    'retailLocations        RetailLocationStock[]\n  retailPurchaseOrders   RetailPurchaseOrder[] @relation("LocationPurchaseOrders")'
  );
}

// Also add RetailProduct relation for POItems
if (!schema.includes('"ProductPOItems"')) {
  schema = schema.replace(
    'orderItems     RetailOrderItem[]',
    'orderItems     RetailOrderItem[]\n  poItems        RetailPurchaseOrderItem[] @relation("ProductPOItems")'
  );
}

fs.writeFileSync("src/prisma/contract.prisma", schema);
console.log("Schema patched successfully.");
console.log("RetailPurchaseOrder found:", schema.includes("model RetailPurchaseOrder {"));
console.log("RetailPurchaseOrderItem found:", schema.includes("model RetailPurchaseOrderItem {"));
