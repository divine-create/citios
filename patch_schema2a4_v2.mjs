import fs from "fs";

let schema = fs.readFileSync("src/prisma/contract.prisma", "utf8");

// Use CRLF line endings to match the file
const CRLF = "\r\n";

const oldBlock = "model RetailPurchaseOrder {\r\n  id             String       @id @default(uuid())\r\n  organizationId String\r\n  organization   Organization @relation(\"OrgRetailPurchaseOrders\", fields: [organizationId], references: [id], onDelete: Cascade)\r\n  \r\n  supplierId     String\r\n  supplier       RetailSupplier @relation(fields: [supplierId], references: [id])\r\n  \r\n  poNumber       String\r\n  status         String       @default(\"DRAFT\") // DRAFT, SENT, RECEIVED, PARTIAL\r\n  \r\n  expectedDate   DateTime?\r\n  totalAmount    Float?\r\n\r\n  createdAt      DateTime     @default(now())\r\n  updatedAt      DateTime     @default(now())\r\n}";

const newBlock = "model RetailPurchaseOrder {\r\n  id             String       @id @default(uuid())\r\n  organizationId String\r\n  organization   Organization @relation(\"OrgRetailPurchaseOrders\", fields: [organizationId], references: [id], onDelete: Cascade)\r\n\r\n  supplierId     String\r\n  supplier       RetailSupplier @relation(fields: [supplierId], references: [id])\r\n\r\n  locationId     String?\r\n  location       Location?    @relation(\"LocationPurchaseOrders\", fields: [locationId], references: [id])\r\n\r\n  poNumber       String\r\n  status         String       @default(\"DRAFT\") // DRAFT, SUBMITTED, APPROVED, PARTIAL, RECEIVED, CANCELLED\r\n\r\n  notes          String?\r\n  expectedDate   DateTime?\r\n  totalAmount    Float?\r\n\r\n  items          RetailPurchaseOrderItem[]\r\n\r\n  createdAt      DateTime     @default(now())\r\n  updatedAt      DateTime     @default(now())\r\n\r\n  @@index([organizationId])\r\n}\r\n\r\nmodel RetailPurchaseOrderItem {\r\n  id          String              @id @default(uuid())\r\n  poId        String\r\n  po          RetailPurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)\r\n\r\n  productId   String\r\n  product     RetailProduct       @relation(\"ProductPOItems\", fields: [productId], references: [id])\r\n\r\n  orderedQty  Float\r\n  receivedQty Float               @default(0)\r\n  unitCost    Float\r\n  totalCost   Float\r\n\r\n  createdAt   DateTime            @default(now())\r\n\r\n  @@index([poId])\r\n}";

if (!schema.includes(oldBlock)) {
  console.error("Old block not found in schema");
  process.exit(1);
}

schema = schema.replace(oldBlock, newBlock);

// Add Location back-relation if not present
if (!schema.includes('"LocationPurchaseOrders"')) {
  schema = schema.replace(
    "  retailLocations        RetailLocationStock[]",
    "  retailLocations        RetailLocationStock[]\r\n  retailPurchaseOrders   RetailPurchaseOrder[] @relation(\"LocationPurchaseOrders\")"
  );
}

// Add RetailProduct back-relation for POItems
if (!schema.includes('"ProductPOItems"')) {
  schema = schema.replace(
    "  orderItems     RetailOrderItem[]",
    "  orderItems     RetailOrderItem[]\r\n  poItems        RetailPurchaseOrderItem[] @relation(\"ProductPOItems\")"
  );
}

fs.writeFileSync("src/prisma/contract.prisma", schema);
console.log("Done.");
console.log("PO found:", schema.includes("model RetailPurchaseOrder {"));
console.log("POItem found:", schema.includes("model RetailPurchaseOrderItem {"));
console.log("Location relation:", schema.includes('"LocationPurchaseOrders"'));
console.log("Product relation:", schema.includes('"ProductPOItems"'));
