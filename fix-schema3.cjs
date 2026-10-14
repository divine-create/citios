const fs = require('fs');

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

// The line currently in the file seems to match this exactly:
schema = schema.replace(/  payouts         Payout\[\] @relation\("OrganizationPayouts"\)\n/g, '');

// Now let's inject it into Organization right after payments Payment[]
// There is likely `payments        Payment[]      @relation("OrganizationPayments")`
if (!schema.includes('payouts         Payout[]')) {
  schema = schema.replace(
    /payments        Payment\[\]      @relation\("OrganizationPayments"\)/,
    'payments        Payment[]      @relation("OrganizationPayments")\n  payouts         Payout[] @relation("OrganizationPayouts")'
  );
}

fs.writeFileSync('src/prisma/contract.prisma', schema);
console.log('Fixed schema 3');
