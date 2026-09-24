import fs from 'fs';

let code = fs.readFileSync('lib/actions/restaurantos.ts', 'utf8');

// Fix Recipe Depletion logic in helpers
const oldRecipeDepletion1 = `if (enableRecipes && menuItem.recipeId) {
        const recipe = await tx.orm.public.RestaurantRecipe.where({ id: menuItem.recipeId }).all().first();`;
const newRecipeDepletion1 = `if (enableRecipes) {
        const recipe = await tx.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();`;

code = code.replaceAll(oldRecipeDepletion1, newRecipeDepletion1);

// Fix createProductionRun Prisma Next methods
const oldProdRun1 = `const recipe = await tx.orm.public.RestaurantRecipe.findUnique({
          where: { id: input.recipeId }
        });`;
const newProdRun1 = `const recipe = await tx.orm.public.RestaurantRecipe.where({ id: input.recipeId }).all().first();`;
code = code.replace(oldProdRun1, newProdRun1);

const oldProdRun2 = `const producedItem = await tx.orm.public.RestaurantInventoryItem.findFirst({
          where: { recipeId: recipe.id }
        });`;
const newProdRun2 = `const producedItem = await tx.orm.public.RestaurantInventoryItem.where({ recipeId: recipe.id }).all().first();`;
code = code.replace(oldProdRun2, newProdRun2);

const oldProdRun3 = `quantity: -totalDeduction,`;
const newProdRun3 = `delta: -totalDeduction,`;
code = code.replace(oldProdRun3, newProdRun3);

const oldProdRun4 = `quantity: input.actualYield,`;
const newProdRun4 = `delta: input.actualYield,`;
code = code.replace(oldProdRun4, newProdRun4);

const oldProdRun5 = `await tx.orm.public.RestaurantInventoryItem.update({
            where: { id: producedItem.id },
            data: { quantity: producedItem.quantity + input.actualYield }
          });`;
const newProdRun5 = `await tx.execute(db.raw.sql\\\`UPDATE "restaurantInventoryItem" SET quantity = quantity + \${input.actualYield} WHERE id = \${producedItem.id}\\\`.affectedCount().build());`;
code = code.replace(oldProdRun5, newProdRun5);

// Update Settings Action
const settingsActionOld = `export async function updateRestaurantOSSettings(organizationId: string, input: {
    taxRate?: number;
    serviceCharge?: number;
    serviceStyle?: 'QUICK_SERVICE' | 'FULL_SERVICE' | 'COUNTER';
    currency?: string;
  }) {`;
const settingsActionNew = `export async function updateRestaurantOSSettings(organizationId: string, input: {
    taxRate?: number;
    serviceCharge?: number;
    serviceStyle?: 'QUICK_SERVICE' | 'FULL_SERVICE' | 'COUNTER';
    currency?: string;
    enableVariants?: boolean;
    enableModifiers?: boolean;
    enableRecipes?: boolean;
    enableInventory?: boolean;
    enableFoodCosting?: boolean;
    enableProduction?: boolean;
  }) {`;
code = code.replace(settingsActionOld, settingsActionNew);

fs.writeFileSync('lib/actions/restaurantos.ts', code);
