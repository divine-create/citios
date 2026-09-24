import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// 1. Refactor Inventory Deduction into a helper function (if not exists)
if (!code.includes('async function deductInventory')) {
  code = `
async function deductInventory(tx: any, organizationId: string, itemId: string, delta: number, type: string) {
  const lockedInvCount = await tx.execute(db.raw.sql\`SELECT id FROM "restaurantInventoryItem" WHERE id = \${itemId} FOR UPDATE\`.affectedCount().build());
  if (lockedInvCount > 0) {
    const invItem = await tx.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    if (invItem) {
      await tx.execute(db.raw.sql\`
        UPDATE "restaurantInventoryItem" 
        SET "quantity" = "quantity" + \${delta}
        WHERE id = \${invItem.id}
      \`.affectedCount().build());
      await tx.orm.public.RestaurantStockMovement.create({
        organizationId,
        itemId: invItem.id,
        type,
        delta,
        unitCost: invItem.cost,
      });
    }
  }
}
` + code;
}

// 2. Replace the inventory consumption block in updateOrderStatus
const oldConsumptionBlock = /if \(status === 'COMPLETED' && !order\.inventoryConsumed\) \{[\s\S]*?await tx\.orm\.public\.RestaurantOrder\.where\(\{ id: orderId \}\)\.update\(\{ inventoryConsumed: true \}\);\s*\}/;

const newConsumptionBlock = `if (status === 'COMPLETED' && !order.inventoryConsumed) {
          const settings = await tx.orm.public.RestaurantSettings.where({ organizationId: order.organizationId }).all().first();
          const enableInventory = settings?.enableInventory ?? false;
          const enableRecipes = settings?.enableRecipes ?? false;

          if (enableInventory) {
            const items = await tx.orm.public.OrderItem.where({ orderId: orderId }).all();
            for (const line of items) {
              const menuItem = await tx.orm.public.MenuItem.where({ id: line.menuItemId }).all().first();
              if (!menuItem) continue;

              // 1. Base item direct mapping
              if (menuItem.inventoryItemId) {
                await deductInventory(tx, order.organizationId, menuItem.inventoryItemId, -line.quantity, 'POS_SALE');
              }

              // 2. Recipe components
              if (enableRecipes && menuItem.recipeId) {
                const recipe = await tx.orm.public.RestaurantRecipe.where({ id: menuItem.recipeId }).all().first();
                if (recipe) {
                  const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
                  const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
                  for (const ing of ingredients) {
                    await deductInventory(tx, order.organizationId, ing.itemId, -(ing.quantity * portionMultiplier), 'POS_SALE');
                  }
                }
              }

              // 3. Modifiers (if any have inventory mapping)
              const modifiers = await tx.orm.public.OrderItemModifier.where({ orderItemId: line.id }).all();
              for (const mod of modifiers) {
                if (mod.modifierOptionId) {
                  const opt = await tx.orm.public.ModifierOption.where({ id: mod.modifierOptionId }).all().first();
                  if (opt && opt.inventoryItemId && opt.inventoryQuantity) {
                    await deductInventory(tx, order.organizationId, opt.inventoryItemId, -(opt.inventoryQuantity * line.quantity), 'POS_SALE');
                  }
                }
              }
            }
          }
          await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ inventoryConsumed: true });
        }`;

code = code.replace(oldConsumptionBlock, newConsumptionBlock);

// 3. Replace the reversal block in CANCELLED
const oldReversalBlock = /if \(status === 'CANCELLED' && order\.inventoryConsumed\) \{[\s\S]*?await tx\.orm\.public\.RestaurantOrder\.where\(\{ id: orderId \}\)\.update\(\{ inventoryConsumed: false \}\);\s*\}/;

const newReversalBlock = `if (status === 'CANCELLED' && order.inventoryConsumed) {
          const settings = await tx.orm.public.RestaurantSettings.where({ organizationId: order.organizationId }).all().first();
          const enableInventory = settings?.enableInventory ?? false;
          const enableRecipes = settings?.enableRecipes ?? false;

          if (enableInventory) {
            const items = await tx.orm.public.OrderItem.where({ orderId: orderId }).all();
            for (const line of items) {
              const menuItem = await tx.orm.public.MenuItem.where({ id: line.menuItemId }).all().first();
              if (!menuItem) continue;

              if (menuItem.inventoryItemId) {
                await deductInventory(tx, order.organizationId, menuItem.inventoryItemId, line.quantity, 'MANUAL_ADJUSTMENT');
              }

              if (enableRecipes && menuItem.recipeId) {
                const recipe = await tx.orm.public.RestaurantRecipe.where({ id: menuItem.recipeId }).all().first();
                if (recipe) {
                  const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
                  const portionMultiplier = line.quantity / (recipe.yieldQuantity || 1);
                  for (const ing of ingredients) {
                    await deductInventory(tx, order.organizationId, ing.itemId, (ing.quantity * portionMultiplier), 'MANUAL_ADJUSTMENT');
                  }
                }
              }

              const modifiers = await tx.orm.public.OrderItemModifier.where({ orderItemId: line.id }).all();
              for (const mod of modifiers) {
                if (mod.modifierOptionId) {
                  const opt = await tx.orm.public.ModifierOption.where({ id: mod.modifierOptionId }).all().first();
                  if (opt && opt.inventoryItemId && opt.inventoryQuantity) {
                    await deductInventory(tx, order.organizationId, opt.inventoryItemId, (opt.inventoryQuantity * line.quantity), 'MANUAL_ADJUSTMENT');
                  }
                }
              }
            }
          }
          await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ inventoryConsumed: false });
        }`;

code = code.replace(oldReversalBlock, newReversalBlock);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
