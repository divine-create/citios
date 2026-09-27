const fs = require('fs');
let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

if (!schema.includes('enum OrganizationStatus')) {
  schema = schema.replace('enum OrgType {', 'enum OrganizationStatus {\n  ACTIVE\n  SUSPENDED\n}\n\nenum OrgType {');
}

if (!schema.includes('status        OrganizationStatus')) {
  schema = schema.replace('createdAt   DateTime @default(now())', 'status      OrganizationStatus @default(ACTIVE)\n    createdAt   DateTime @default(now())');
}

if (!schema.includes('model HQAuditEvent')) {
  schema += '\n\nmodel HQAuditEvent {\n  id            String   @id @default(uuid())\n  actorPersonId String\n  action        String\n  targetType    String\n  targetId      String\n  metadata      Json?\n  createdAt     DateTime @default(now())\n\n  actor         Person   @relation(fields: [actorPersonId], references: [id])\n}\n';
}

if (!schema.includes('hqAuditEvents  HQAuditEvent[]')) {
  schema = schema.replace('wallets        Wallet[]', 'wallets        Wallet[]\n  hqAuditEvents  HQAuditEvent[]');
}

fs.writeFileSync('src/prisma/contract.prisma', schema);
