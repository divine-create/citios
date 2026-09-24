import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const helper = `export async function requireRestaurantCapability(organizationId: string, capability: string) {
  const settings = await db.orm.public.RestaurantSettings.where({ organizationId }).all().first();
  if (!settings || !(settings as any)[capability]) {
    throw new Error(\`Capability \${capability} is not enabled.\`);
  }
}

`;

if (!code.includes('requireRestaurantCapability')) {
  code = code.replace(/export async function getRestaurantOSSettings/, helper + 'export async function getRestaurantOSSettings');
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Helper injected!");
} else {
  console.log("Helper already exists!");
}
