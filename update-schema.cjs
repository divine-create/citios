const fs = require('fs');
let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

// Fix @updatedAt
schema = schema.replace(/@updatedAt/g, '');

// Add SupportCase[], RefundRequest[] to Person if not exists
if (schema.includes('model Person {') && !schema.includes('supportCases   SupportCase[]')) {
  schema = schema.replace(
    /model Person \{[\s\S]*?\n\}/,
    (match) => match.replace(/\n\}/, '\n  supportCases   SupportCase[]\n  refundRequests RefundRequest[]\n}')
  );
}

// Add Payout[], SupportCase[], RefundRequest[] to Organization if not exists
if (schema.includes('model Organization {') && !schema.includes('payouts         Payout[]')) {
  schema = schema.replace(
    /model Organization \{[\s\S]*?\n\}/,
    (match) => match.replace(/\n\}/, '\n  payouts         Payout[]\n  supportCases    SupportCase[]\n  refundRequests  RefundRequest[]\n}')
  );
}

// Add RefundRequest[] to Payment if not exists
if (schema.includes('model Payment {') && !schema.includes('refundRequests RefundRequest[]')) {
  schema = schema.replace(
    /model Payment \{[\s\S]*?\n\}/,
    (match) => match.replace(/\n\}/, '\n  refundRequests RefundRequest[]\n}')
  );
}

fs.writeFileSync('src/prisma/contract.prisma', schema);
console.log("Updated schema.");
