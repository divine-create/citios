const fs = require('fs');
let content = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

content = content.replace(
  'model Person {\n  id             String             @id @default(uuid())\n  firstName      String\n  lastName       String\n  dateOfBirth    DateTime?',
  'model Person {\n  id             String             @id @default(uuid())\n  firstName      String\n  lastName       String\n  dateOfBirth    DateTime?\n  isSystemAdmin  Boolean            @default(false)'
);

fs.writeFileSync('src/prisma/contract.prisma', content);
