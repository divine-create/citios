import fs from 'fs';

const codeToAppend = `
// Phase D.1 Hardening: Secure Capability-Gated Mutations
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
  if (!group || group.organizationId !== input.organizationId) {
    throw new Error("Invalid modifier group.");
  }

  if (input.inventoryItemId) {
    const inv = await db.orm.public.RestaurantInventoryItem.where({ id: input.inventoryItemId }).all().first();
    if (!inv || inv.organizationId !== input.organizationId) {
      throw new Error("Invalid inventory item ownership.");
    }
  }

  const option = await db.orm.public.ModifierOption.create({
    organizationId: input.organizationId,
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

  const item = await db.orm.public.MenuItem.where({ id: input.menuItemId }).all().first();
  if (!item || item.organizationId !== input.organizationId) throw new Error("Invalid menu item.");

  const group = await db.orm.public.ModifierGroup.where({ id: input.modifierGroupId }).all().first();
  if (!group || group.organizationId !== input.organizationId) throw new Error("Invalid modifier group.");

  const link = await db.orm.public.MenuItemModifierGroup.create({
    menuItemId: input.menuItemId,
    modifierGroupId: input.modifierGroupId
  });
  return JSON.parse(JSON.stringify(link));
}
`;

fs.appendFileSync('lib/actions/restaurantos.ts', codeToAppend);
console.log("Appended modifier actions!");
