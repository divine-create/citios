import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

const regex = /const modifiers: any\[\] = \[\];[\s\S]*?modifiers\.push\(\{ optionId: opt\.id, name: opt\.name, priceDelta: opt\.priceDelta \}\);\s*\}\s*\}\s*\}/;

const newBlock = `const modifiers: any[] = [];
        let unitCost = 0;

        // Base Item Unit Cost
        const recipe = await db.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();
        if (recipe) {
          const ingredients = await db.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
          for (const ing of ingredients) {
            const inv = await db.orm.public.RestaurantInventoryItem.where({ id: ing.itemId }).all().first();
            if (inv) {
              unitCost += (inv.cost * ing.quantity) / (recipe.yieldQuantity || 1);
            }
          }
        } else if (menuItem.inventoryItemId) {
          const inv = await db.orm.public.RestaurantInventoryItem.where({ id: menuItem.inventoryItemId }).all().first();
          if (inv) unitCost += inv.cost;
        }

        if (item.modifierOptionIds && item.modifierOptionIds.length > 0) {
          const opts = await db.orm.public.ModifierOption.where({ id: { in: item.modifierOptionIds } }).all();
          
          // Basic security: Ensure options belong to the organization (indirectly via groups, but we just check if they exist since they are linked to menu items).
          // For absolute strictness we should trace to org, but for now we validate they exist.
          
          for (const optId of item.modifierOptionIds) {
            const opt = opts.find((o: any) => o.id === optId);
            if (opt) {
              unitPrice += opt.priceDelta;
              modifiers.push({ optionId: opt.id, name: opt.name, priceDelta: opt.priceDelta });

              // Modifier Unit Cost
              if (opt.inventoryItemId && opt.inventoryQuantity) {
                const inv = await db.orm.public.RestaurantInventoryItem.where({ id: opt.inventoryItemId }).all().first();
                if (inv) {
                   unitCost += inv.cost * opt.inventoryQuantity;
                }
              }
            }
          }
        }`;

if (regex.test(code)) {
  code = code.replace(regex, newBlock);
  fs.writeFileSync('lib/actions/restaurantos.ts', code);
  console.log("Successfully updated unit cost calculation!");
} else {
  console.log("Regex did not match!");
}
