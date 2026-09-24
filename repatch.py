import sys
import re

try:
    with open('lib/actions/restaurantos.ts.old', 'r', encoding='utf-16') as f:
        code = f.read()
except:
    with open('lib/actions/restaurantos.ts.old', 'r', encoding='utf-8') as f:
        code = f.read()

# 1. Add requireRestaurantCapability helper
helper = """export async function requireRestaurantCapability(organizationId: string, capability: string) {
  const settings = await db.orm.public.RestaurantSettings.where({ organizationId }).all().first();
  if (!settings || !(settings as any)[capability]) {
    throw new Error(`Capability ${capability} is not enabled.`);
  }
}

"""
code = code.replace("export async function getRestaurantOSSettings", helper + "export async function getRestaurantOSSettings")


# 2. Patch createRecipe location and capability checks
recipe_patch = """export async function createRecipe(input: {
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

    return await db.transaction(async (tx: any) => {"""
code = re.sub(r'export async function createRecipe\([\s\S]*?return await db\.transaction\(async \(tx: any\) => \{', recipe_patch, code)

# 3. Patch settings enforcement
settings_patch = """const { logoAssetId, ...settingsUpdates } = updates;
      
      if (settingsUpdates.enableProduction === true) {
        settingsUpdates.enableRecipes = true;
        settingsUpdates.enableInventory = true;
      }
      if (settingsUpdates.enableFoodCosting === true) {
        settingsUpdates.enableRecipes = true;
        settingsUpdates.enableInventory = true;
      }
      if (settingsUpdates.enableRecipes === true) {
        settingsUpdates.enableInventory = true;
      }
      if (settingsUpdates.enableInventory === false) {
        settingsUpdates.enableRecipes = false;
        settingsUpdates.enableProduction = false;
        settingsUpdates.enableFoodCosting = false;
      }
      if (settingsUpdates.enableRecipes === false) {
        settingsUpdates.enableProduction = false;
        settingsUpdates.enableFoodCosting = false;
      }"""
code = code.replace("const { logoAssetId, ...settingsUpdates } = updates;", settings_patch)

# 4. Patch inventory and production capability gates
code = code.replace("await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);\n    if (!input.name",
"await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);\n    await requireRestaurantCapability(input.organizationId, 'enableInventory');\n    if (!input.name")

code = code.replace("const mem = await requireMembership(input.organizationId);\n      \n      return await db.transaction",
"const mem = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN', 'INVENTORY_STAFF']);\n      await requireRestaurantCapability(input.organizationId, 'enableProduction');\n      return await db.transaction")

# 5. Fix revalidatePath
code = code.replace("revalidatePath('/admin/restaurantos')", "revalidatePath('/', 'layout')")

# 6. Variant check in createPosOrder
variant_orig = """if (item.variantId) {
            const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
            if (variant) {
              unitPrice = variant.price;
              variantName = variant.name;
            }
          }"""
variant_patch = """if (item.variantId) {
            if (!settings?.enableVariants) return { error: 'Variants are disabled for this organization.' };
            const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
            if (!variant || !variant.isAvailable) return { error: 'Invalid or inactive variant selected.' };
            unitPrice = variant.price;
            variantName = variant.name;
          }"""
code = code.replace(variant_orig, variant_patch)

# 7. settings used before declaration
settings_orig = """// Settings: tax, service charge, next call-out number.
      const settings = await db.orm.public.RestaurantSettings
        .where({ organizationId: input.organizationId })
        .all()
        .first();"""
code = code.replace(settings_orig, "// Settings was moved up.")
code = code.replace("const lineItems: any[] = [];", 
    "const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();\n      const lineItems: any[] = [];")

# 8. Modifiers array passing
code = code.replace("id: { in: item.modifierOptionIds }", "id: item.modifierOptionIds")


# 9. Add missing modifier and variant actions
new_actions = """
export async function createModifierGroup(input: {
  organizationId: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
}) {
  await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
  await requireRestaurantCapability(input.organizationId, 'enableModifiers');
  const group = await db.orm.public.ModifierGroup.create({
    organizationId: input.organizationId,
    name: input.name,
    isRequired: input.isRequired,
    minSelections: input.minSelections,
    maxSelections: input.maxSelections
  });
  return JSON.parse(JSON.stringify(group));
}

export async function createModifierOption(input: {
  organizationId: string;
  modifierGroupId: string;
  name: string;
  priceDelta: number;
  inventoryItemId?: string;
}) {
  await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
  await requireRestaurantCapability(input.organizationId, 'enableModifiers');

  const group = await db.orm.public.ModifierGroup.where({ id: input.modifierGroupId }).all().first();
  if (!group || group.organizationId !== input.organizationId) throw new Error("Invalid modifier group.");

  if (input.inventoryItemId) {
    const inv = await db.orm.public.RestaurantInventoryItem.where({ id: input.inventoryItemId }).all().first();
    if (!inv || inv.organizationId !== input.organizationId) throw new Error("Invalid inventory item ownership.");
  }

  const option = await db.orm.public.ModifierOption.create({
    modifierGroupId: input.modifierGroupId,
    name: input.name,
    priceDelta: input.priceDelta,
    inventoryItemId: input.inventoryItemId || null
  });
  return JSON.parse(JSON.stringify(option));
}

export async function attachModifierGroupToMenuItem(input: {
  organizationId: string;
  menuItemId: string;
  modifierGroupId: string;
}) {
  await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
  await requireRestaurantCapability(input.organizationId, 'enableModifiers');
  const link = await db.orm.public.MenuItemModifierGroup.create({
    menuItemId: input.menuItemId,
    modifierGroupId: input.modifierGroupId
  });
  return JSON.parse(JSON.stringify(link));
}

export async function createVariant(input: {
  organizationId: string;
  menuItemId: string;
  name: string;
  price: number;
}) {
  await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
  await requireRestaurantCapability(input.organizationId, 'enableVariants');
  const variant = await db.orm.public.MenuItemVariant.create({
    organizationId: input.organizationId,
    menuItemId: input.menuItemId,
    name: input.name,
    price: input.price
  });
  return JSON.parse(JSON.stringify(variant));
}

export async function updateVariant(variantId: string, input: Partial<{ name: string; price: number; isAvailable: boolean }>) {
  const variant = await db.orm.public.MenuItemVariant.where({ id: variantId }).all().first();
  if (!variant) throw new Error("Variant not found.");
  await requireMembership(variant.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
  await db.orm.public.MenuItemVariant.where({ id: variantId }).update(input as any);
  return { success: true };
}
"""
code += new_actions

with open('lib/actions/restaurantos.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Re-patched restaurantos.ts safely!")
