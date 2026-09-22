import fs from 'fs';

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

schema = schema.replace(
  /updatedAt\s+DateTime\s+@updatedAt/,
  'updatedAt      DateTime?'
);

fs.writeFileSync('src/prisma/contract.prisma', schema);
console.log('Fixed schema');
