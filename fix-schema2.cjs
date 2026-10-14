const fs = require('fs');

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

// Replace @updatedAt with @default(now())
schema = schema.replace(/@updatedAt/g, '@default(now())');

// Remove the incorrect payouts line from RetailSettings
schema = schema.replace('  payouts         Payout[] @relation("OrganizationPayouts")\n', '');

// Add payouts to Organization (we'll look for `payments` array and insert below it)
schema = schema.replace(
  'payments        Payment[]',
  'payments        Payment[]\n  payouts         Payout[] @relation("OrganizationPayouts")'
);

fs.writeFileSync('src/prisma/contract.prisma', schema);
console.log('Fixed schema');
