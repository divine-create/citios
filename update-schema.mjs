import fs from 'fs';

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

const model = `
model RetailLocationStock {
  id             String        @id @default(uuid())
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  locationId     String
  location       Location      @relation(fields: [locationId], references: [id], onDelete: Cascade)
  
  productId      String
  product        RetailProduct @relation(fields: [productId], references: [id], onDelete: Cascade)

  stockQuantity  Float         @default(0)
  lowStockLevel  Float?

  updatedAt      DateTime      @updatedAt

  @@unique([locationId, productId])
}
`;

// Insert the new model before RetailStockMovement
schema = schema.replace(/model RetailStockMovement \{/, model + '\nmodel RetailStockMovement {');

fs.writeFileSync('src/prisma/contract.prisma', schema);
console.log('Modified schema');
