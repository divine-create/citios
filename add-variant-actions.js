import fs from 'fs';

const codeToAppend = `
// Phase D.1 Hardening: Secure Capability-Gated Variant Mutations
export async function createVariant(input: {
  organizationId: string;
  menuItemId: string;
  name: string;
  price: number;
}) {
  await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
  await requireRestaurantCapability(input.organizationId, 'enableVariants');

  const item = await db.orm.public.MenuItem.where({ id: input.menuItemId }).all().first();
  if (!item || item.organizationId !== input.organizationId) throw new Error("Invalid menu item.");

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
  
  // Safe update
  await db.orm.public.MenuItemVariant.where({ id: variantId }).update(input as any);
  return { success: true };
}
`;

fs.appendFileSync('lib/actions/restaurantos.ts', codeToAppend);
console.log("Appended variant actions!");
