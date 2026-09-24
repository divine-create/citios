import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /export\s+async\s+function\s+updateRestaurantOSSettings\s*\(\s*organizationId:\s*string,\s*updates:\s*Partial<\{([\s\S]*?)\}>\s*,?\s*\)\s*\{/;

if (regex.test(code)) {
  code = code.replace(regex, (match, p1) => {
    return `export async function updateRestaurantOSSettings(
  organizationId: string,
  updates: Partial<{${p1}  enableVariants: boolean;
    enableModifiers: boolean;
    enableRecipes: boolean;
    enableInventory: boolean;
    enableFoodCosting: boolean;
    enableProduction: boolean;
  }>
) {`;
  });
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Successfully updated Settings action signature!");
} else {
  console.log("Settings action signature not found!");
}
