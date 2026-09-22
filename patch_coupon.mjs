import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

code = code.replace(
  /let coupon = null;/,
  `let coupon: { id: string; code: string; type: string; value: number; minSpend: number; isActive: boolean; usageLimit: number | null; timesUsed: number; expiresAt: unknown } | null = null;`
);

fs.writeFileSync('lib/actions/retail.ts', code);
console.log('Fixed coupon typing');
