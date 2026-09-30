const fs = require('fs');
let code = fs.readFileSync('app/actions/cart.ts', 'utf8');

code = code.replace(
  "import { getServerSession } from 'next-auth';",
  "import { getServerSession } from 'next-auth';\nimport { authOptions } from '@/lib/auth';"
);

code = code.replace(/await getServerSession\(\)/g, "await getServerSession(authOptions)");

fs.writeFileSync('app/actions/cart.ts', code);
