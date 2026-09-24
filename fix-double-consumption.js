import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// Fix consumeInventoryForOrder
const consumeOld = `if (menuItem.inventoryItemId) {
          await deductInventory(tx, organizationId, menuItem.inventoryItemId, -line.quantity, 'POS_SALE');
        }
  
        if (enableRecipes) {
          const recipe = await tx.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();
          if (recipe) {
            const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
            const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
            for (const ing of ingredients) {
              await deductInventory(tx, organizationId, ing.itemId, -(ing.quantity * portionMultiplier), 'POS_SALE');
            }
          }
        }`;

const consumeNew = `let consumedBase = false;
        if (enableRecipes) {
          const recipe = await tx.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();
          if (recipe) {
            const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
            const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
            for (const ing of ingredients) {
              await deductInventory(tx, organizationId, ing.itemId, -(ing.quantity * portionMultiplier), 'POS_SALE');
            }
            consumedBase = true;
          }
        }
        
        if (!consumedBase && menuItem.inventoryItemId) {
          await deductInventory(tx, organizationId, menuItem.inventoryItemId, -line.quantity, 'POS_SALE');
        }`;
code = code.replace(consumeOld, consumeNew);

// Fix reverseInventoryForOrder
const reverseOld = `if (menuItem.inventoryItemId) {
          await deductInventory(tx, organizationId, menuItem.inventoryItemId, line.quantity, 'MANUAL_ADJUSTMENT');
        }
  
        if (enableRecipes) {
          const recipe = await tx.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();
          if (recipe) {
            const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
            const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
            for (const ing of ingredients) {
              await deductInventory(tx, organizationId, ing.itemId, (ing.quantity * portionMultiplier), 'MANUAL_ADJUSTMENT');
            }
          }
        }`;

const reverseNew = `let reversedBase = false;
        if (enableRecipes) {
          const recipe = await tx.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();
          if (recipe) {
            const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
            const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
            for (const ing of ingredients) {
              await deductInventory(tx, organizationId, ing.itemId, (ing.quantity * portionMultiplier), 'MANUAL_ADJUSTMENT');
            }
            reversedBase = true;
          }
        }
        
        if (!reversedBase && menuItem.inventoryItemId) {
          await deductInventory(tx, organizationId, menuItem.inventoryItemId, line.quantity, 'MANUAL_ADJUSTMENT');
        }`;
code = code.replace(reverseOld, reverseNew);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
