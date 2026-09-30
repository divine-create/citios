const fs = require('fs');
let c = fs.readFileSync('lib/auth.ts', 'utf8');
c = c.replace('import GoogleProvider from "next-auth/providers/google";', 'import _GoogleProvider from "next-auth/providers/google";\nconst GoogleProvider = ((_GoogleProvider as any).default || _GoogleProvider) as typeof _GoogleProvider;');
fs.writeFileSync('lib/auth.ts', c);
