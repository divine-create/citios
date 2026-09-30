const fs = require('fs');

let schema = fs.readFileSync('src/prisma/contract.prisma', 'utf8');

if (!schema.includes('embedding pgvector.Vector')) {
  schema = schema.replace(
    'model Organization {',
    'model Organization {\n  embedding pgvector.Vector(length: 768)?'
  );
  schema = schema.replace(
    'model RetailProduct {',
    'model RetailProduct {\n  embedding pgvector.Vector(length: 768)?'
  );
  schema = schema.replace(
    'model MenuItem {',
    'model MenuItem {\n  embedding pgvector.Vector(length: 768)?'
  );
  fs.writeFileSync('src/prisma/contract.prisma', schema);
}
