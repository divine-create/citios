import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /if \(input\.producedItemId\) \{[\s\S]*?for \(const ing of input\.ingredients\) \{[\s\S]*?\}/;

const replacement = `let targetLocationId: string | null | undefined = undefined;
        
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
        }`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Patched cross-location recipe safety!");
} else {
  console.log("Regex missed!");
}
