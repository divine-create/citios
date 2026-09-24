import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

if (!code.includes('async function consumeInventoryForOrder')) {
  code = `
async function consumeInventoryForOrder(tx: any, orderId: string, organizationId: string, settings: any) {
  const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
  if (!order || order.inventoryConsumed) return;

  const enableInventory = settings?.enableInventory ?? false;
  const enableRecipes = settings?.enableRecipes ?? false;

  if (enableInventory) {
    const items = await tx.orm.public.OrderItem.where({ orderId: orderId }).all();
    for (const line of items) {
      const menuItem = await tx.orm.public.MenuItem.where({ id: line.menuItemId }).all().first();
      if (!menuItem) continue;

      if (menuItem.inventoryItemId) {
        await deductInventory(tx, organizationId, menuItem.inventoryItemId, -line.quantity, 'POS_SALE');
      }

      if (enableRecipes && menuItem.recipeId) {
        const recipe = await tx.orm.public.RestaurantRecipe.where({ id: menuItem.recipeId }).all().first();
        if (recipe) {
          const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
          const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
          for (const ing of ingredients) {
            await deductInventory(tx, organizationId, ing.itemId, -(ing.quantity * portionMultiplier), 'POS_SALE');
          }
        }
      }

      const modifiers = await tx.orm.public.OrderItemModifier.where({ orderItemId: line.id }).all();
      for (const mod of modifiers) {
        if (mod.modifierOptionId) {
          const opt = await tx.orm.public.ModifierOption.where({ id: mod.modifierOptionId }).all().first();
          if (opt && opt.inventoryItemId && opt.inventoryQuantity) {
            await deductInventory(tx, organizationId, opt.inventoryItemId, -(opt.inventoryQuantity * line.quantity), 'POS_SALE');
          }
        }
      }
    }
  }
  await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ inventoryConsumed: true });
}

async function reverseInventoryForOrder(tx: any, orderId: string, organizationId: string, settings: any) {
  const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
  if (!order || !order.inventoryConsumed) return;

  const enableInventory = settings?.enableInventory ?? false;
  const enableRecipes = settings?.enableRecipes ?? false;

  if (enableInventory) {
    const items = await tx.orm.public.OrderItem.where({ orderId: orderId }).all();
    for (const line of items) {
      const menuItem = await tx.orm.public.MenuItem.where({ id: line.menuItemId }).all().first();
      if (!menuItem) continue;

      if (menuItem.inventoryItemId) {
        await deductInventory(tx, organizationId, menuItem.inventoryItemId, line.quantity, 'MANUAL_ADJUSTMENT');
      }

      if (enableRecipes && menuItem.recipeId) {
        const recipe = await tx.orm.public.RestaurantRecipe.where({ id: menuItem.recipeId }).all().first();
        if (recipe) {
          const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
          const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
          for (const ing of ingredients) {
            await deductInventory(tx, organizationId, ing.itemId, (ing.quantity * portionMultiplier), 'MANUAL_ADJUSTMENT');
          }
        }
      }

      const modifiers = await tx.orm.public.OrderItemModifier.where({ orderItemId: line.id }).all();
      for (const mod of modifiers) {
        if (mod.modifierOptionId) {
          const opt = await tx.orm.public.ModifierOption.where({ id: mod.modifierOptionId }).all().first();
          if (opt && opt.inventoryItemId && opt.inventoryQuantity) {
            await deductInventory(tx, organizationId, opt.inventoryItemId, (opt.inventoryQuantity * line.quantity), 'MANUAL_ADJUSTMENT');
          }
        }
      }
    }
  }
  await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ inventoryConsumed: false });
}
` + code;
}

fs.writeFileSync('lib/actions/restaurantos.ts', code);
