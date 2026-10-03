const fs = require('fs');
let c = fs.readFileSync('src/prisma/contract.prisma', 'utf8');
let idx = 0;
c = c.replace(/@@unique\(\[providerId, idempotencyKey\], map: "uniq_provider_idem_"\)/g, () => {
  idx++;
  return `@@unique([providerId, idempotencyKey], map: "uniq_provider_idem_${idx}")`;
});
fs.writeFileSync('src/prisma/contract.prisma', c);
