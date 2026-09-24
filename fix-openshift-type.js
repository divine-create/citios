import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

code = code.replace(
  "export async function openShift(input: { organizationId: string; locationId: string; openingFloat: number }) {",
  "export async function openShift(input: { organizationId: string; locationId?: string; openingFloat: number }) {"
);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
