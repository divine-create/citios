import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /export async function createRecipe\(input: \{([\s\S]*?)\}\) \{([\s\S]*?)await requireMembership\(input\.organizationId\);/;

const replacement = `export async function createRecipe(input: {$1}) {$2await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
      await requireRestaurantCapability(input.organizationId, 'enableRecipes');
      
      // Multi-location/tenant verification for inventory items
      if (input.producedItemId) {
         const p = await db.orm.public.RestaurantInventoryItem.where({ id: input.producedItemId }).all().first();
         if (!p || p.organizationId !== input.organizationId) throw new Error("Invalid produced item.");
      }
      for (const ing of input.ingredients) {
         const i = await db.orm.public.RestaurantInventoryItem.where({ id: ing.itemId }).all().first();
         if (!i || i.organizationId !== input.organizationId) throw new Error("Invalid ingredient item.");
      }`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Patched createRecipe security!");
} else {
  console.log("Regex missed!");
}
