import fs from 'fs';
let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /export async function createRecipe\([\s\S]*?\/\/ In Prisma Next, we do this in a transaction/m;
const replacement = `export async function createRecipe(input: {
  organizationId: string;
  name: string;
  yieldQuantity: number;
  instructions?: string;
  producedItemId?: string;
  ingredients: { itemId: string; quantity: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
    await requireRestaurantCapability(input.organizationId, 'enableRecipes');
    
    let targetLocationId: string | null | undefined = undefined;
    
    if (input.producedItemId) {
       const p = await db.orm.public.RestaurantInventoryItem.where({ id: input.producedItemId }).all().first();
       if (!p || p.organizationId !== input.organizationId) throw new Error("Invalid produced item.");
       targetLocationId = p.locationId;
    }
    
    for (const ing of input.ingredients) {
       const i = await db.orm.public.RestaurantInventoryItem.where({ id: ing.itemId }).all().first();
       if (!i || i.organizationId !== input.organizationId) throw new Error("Invalid ingredient item.");
       
       if (targetLocationId === undefined) {
         targetLocationId = i.locationId;
       } else if (targetLocationId !== i.locationId) {
         throw new Error("Cross-location mix detected. All ingredients and produced items must belong to the same location.");
       }
    }

    // In Prisma Next, we do this in a transaction`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Fixed createRecipe syntax error!");
} else {
  console.log("Regex missed!");
}
