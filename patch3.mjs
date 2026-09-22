import fs from 'fs';
let code = fs.readFileSync('lib/actions/retail.ts', 'utf8');

code = code.replace(
  /export async function adjustStock\(productId: string, delta: number, locationId\?: string, note\?: string\)/,
  `export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string)`
);

fs.writeFileSync('lib/actions/retail.ts', code);
