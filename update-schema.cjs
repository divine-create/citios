const fs = require('fs');
let c = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

c = c.replace(
  /providerDispatches\s+DeliveryDispatch\[\]\s+@relation\("ProviderDispatches"\)/,
  'providerDispatches   DeliveryDispatch[]       @relation("ProviderDispatches")\n  providerSettlements  LogisticsSettlement[]    @relation("ProviderSettlements")\n  logisticsSettings    LogisticsSettings?       @relation("OrgLogisticsSettings")'
);

c = c.replace(
  /payment\s+Payment\?\s+createdAt\s+DateTime\s+@default\(now\(\)\)/,
  'payment        Payment?\n  logisticsSettlement LogisticsSettlement?\n  createdAt      DateTime     @default(now())'
);

c = c.replace(
  /dispatches\s+DeliveryDispatch\[\]/,
  'dispatches      DeliveryDispatch[]\n  settlement      LogisticsSettlement?'
);

c = c.replace(
  /deliveryJob\s+DeliveryJob\s+@relation\(fields: \[deliveryJobId\], references: \[id\], onDelete: Cascade\)/,
  'deliveryJob     DeliveryJob  @relation(fields: [deliveryJobId], references: [id], onDelete: Cascade)\n  settlement      LogisticsSettlement?'
);

const settlementModels = `
enum SettlementStatus {
  PENDING
  PROCESSING
  SETTLED
  FAILED
}

model LogisticsSettlement {
  id              String       @id @default(uuid())
  providerId      String
  deliveryJobId   String       @unique
  quoteId         String       @unique
  
  grossAmount     Decimal
  fees            Decimal
  providerAmount  Decimal
  currency        String
  
  status          SettlementStatus @default(PENDING)
  idempotencyKey  String?
  
  transactionId   String?      @unique
  
  createdAt       DateTime     @default(now())
  settledAt       DateTime?

  provider        Organization @relation("ProviderSettlements", fields: [providerId], references: [id])
  deliveryJob     DeliveryJob  @relation(fields: [deliveryJobId], references: [id])
  quote           DeliveryQuote @relation(fields: [quoteId], references: [id])
  transaction     Transaction? @relation(fields: [transactionId], references: [id])
  
  @@unique([providerId, idempotencyKey], map: "uniq_provider_idem_settlement")
}

model LogisticsSettings {
  id              String       @id @default(uuid())
  organizationId  String       @unique
  
  platformFeeRate Decimal      @default(0.10)
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @default(now())

  organization    Organization @relation("OrgLogisticsSettings", fields: [organizationId], references: [id], onDelete: Cascade)
}
`;

c += '\n' + settlementModels;
fs.writeFileSync('src/prisma/contract.prisma', c);
console.log("Schema updated!");
