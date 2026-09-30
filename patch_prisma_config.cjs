const fs = require('fs');

let config = fs.readFileSync('prisma.config.ts', 'utf8');

if (!config.includes('@internal/extension-pgvector/control')) {
  config = config.replace(
    "import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';",
    "import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';\nimport pgvector from '@internal/extension-pgvector/control';"
  );
  config = config.replace(
    'contract: "./src/prisma/contract.prisma",',
    'contract: "./src/prisma/contract.prisma",\n    extensions: [pgvector],'
  );
  fs.writeFileSync('prisma.config.ts', config);
}
