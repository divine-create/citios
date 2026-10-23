'use server';


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

      if (enableRecipes) {
        const recipe = await tx.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();
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

      if (enableRecipes) {
        const recipe = await tx.orm.public.RestaurantRecipe.where({ menuItemId: menuItem.id }).all().first();
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

async function deductInventory(tx: any, organizationId: string, itemId: string, delta: number, type: string) {
  const lockedInvCount = await tx.execute(db.raw.sql`SELECT id FROM "restaurantInventoryItem" WHERE id = ${itemId} FOR UPDATE`.affectedCount().build());
  if (lockedInvCount > 0) {
    const invItem = await tx.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    if (invItem) {
      await tx.execute(db.raw.sql`
        UPDATE "restaurantInventoryItem" 
        SET "quantity" = "quantity" + ${delta}
        WHERE id = ${invItem.id}
      `.affectedCount().build());
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
// ============================================================================
// RESTAURANTOS ΓÇö action layer (Restaurants, Eateries & Fast Food)
// ----------------------------------------------------------------------------
// Mirrors lib/actions/retail.ts: every mutation is server-authoritative
// (identity from the session via requireMembership, prices re-read from the
// canonical MenuItem, org scoping enforced on every query). One OS serving
// three operating styles via RestaurantSettings.serviceStyle.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { db } from '@/src/prisma/db';
import { authOptions } from '@/lib/auth';
import { requireMembership } from '@/lib/actions/tenant';
import { notifyPerson, personIdForCustomerData } from '@/lib/notify';
import { pusherServer } from '@/lib/pusher';

function safeRevalidatePath(path = '/', type: 'layout' | 'page' = 'layout') {
  try {
    revalidatePath(path, type);
  } catch {}
}

function toInstant(date: Date = new Date()) {
  return (globalThis as any).Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

// ---------------------------------------------------------------------------
// Settings & provisioning
// ---------------------------------------------------------------------------

export async function requireRestaurantCapability(organizationId: string, capability: string) {
  const settings = await db.orm.public.RestaurantSettings.where({ organizationId }).all().first();
  if (!settings || !(settings as any)[capability]) {
    throw new Error(`Capability ${capability} is not enabled.`);
  }
}

export async function getRestaurantOSSettings(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const settings = await db.orm.public.RestaurantSettings
      .where({ organizationId })
      .all()
      .first();
    const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
    const result = settings ? JSON.parse(JSON.stringify(settings)) : null;
    if (result) {
      result.logoAssetId = org?.logoAssetId || null;
    }
    return result;
  } catch (error) {
    console.error('Error fetching RestaurantOS settings:', error);
    return null;
  }
}

/** Provision the OS for a new restaurant/eatery/fast-food org (idempotent). */
export async function provisionRestaurantOS(organizationId: string, serviceStyle = 'HYBRID') {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER']);
    const existing = await db.orm.public.RestaurantSettings
      .where({ organizationId })
      .all()
      .first();
    if (existing) return existing;
    const settings = await db.orm.public.RestaurantSettings.create({
      organizationId,
      serviceStyle,
    });
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error provisioning RestaurantOS:', error);
    return null;
  }
}

export async function updateRestaurantOSSettings(
  organizationId: string,
  updates: Partial<{
    serviceStyle: 'FULL_SERVICE' | 'COUNTER' | 'HYBRID';
    taxRate: number;
    serviceCharge: number;
    openingHours: string;
    acceptsWalkIns: boolean;
    paymentGateway: string;
    bankDetails: string;
    walletSettlementEnabled: boolean;
    hasSetPayment: boolean;
    hasMenu: boolean;
    hasTables: boolean;
    logoAssetId: string | null;
    enableVariants: boolean;
    enableModifiers: boolean;
    enableRecipes: boolean;
    enableInventory: boolean;
    enableFoodCosting: boolean;
    enableProduction: boolean;
  }>
) {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER']);
    const { logoAssetId, ...settingsUpdates } = updates;
      
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
      }
    const settings = await db.orm.public.RestaurantSettings
      .where({ organizationId })
      .all()
      .first();
    if (!settings) {
      const created = await db.orm.public.RestaurantSettings.create({
        organizationId,
        ...settingsUpdates,
      });
      if (logoAssetId !== undefined) {
        await db.orm.public.Organization.where({ id: organizationId }).update({ logoAssetId });
      }
      safeRevalidatePath('/', 'layout');
      return JSON.parse(JSON.stringify(created));
    }
    if (Object.keys(settingsUpdates).length > 0) {
      await db.orm.public.RestaurantSettings.where({ organizationId }).update(settingsUpdates as any);
    }
    if (logoAssetId !== undefined) {
      await db.orm.public.Organization.where({ id: organizationId }).update({ logoAssetId });
    }
    const updated = await db.orm.public.RestaurantSettings
      .where({ organizationId })
      .all()
      .first();
    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating RestaurantOS settings:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update settings.' };
  }
}

// ---------------------------------------------------------------------------
// Menu management (items, availability/86)
// ---------------------------------------------------------------------------

export async function getMenuItems(organizationId: string, locationId?: string) {
  try {
    await requireMembership(organizationId);
    let q = db.orm.public.MenuItem.where({ organizationId });
    if (locationId) {
      q = q.where({ locationId });
    }
    const items = await q.all();
    const itemIds = items.map((i) => i.id);

    // @ts-ignore ΓÇö Prisma Next `in` operator on the ORM requires a ts-ignore
    const addons = itemIds.length > 0 ? await db.orm.public.MenuItemAddon.where({ organizationId, menuItemId: { in: itemIds } }).all() : [];
    // @ts-ignore
    const variants = itemIds.length > 0 ? await db.orm.public.MenuItemVariant.where({ organizationId, menuItemId: { in: itemIds } }).all() : [];

    return JSON.parse(JSON.stringify(
      items.map((i) => ({
        ...i,
        addons: addons.filter((a: any) => a.menuItemId === i.id),
        variants: variants.filter((v: any) => v.menuItemId === i.id),
      })),
    ));
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
}

export async function createMenuItem(input: {
  organizationId: string;
  name: string;
  description?: string;
  price: number;
  locationId?: string;
  category: string;
  imageUrl?: string;
  kitchenStation?: string;
}) {
  try {
    let locationId = input.locationId;
    if (!locationId) {
      const primaryLoc = await db.orm.public.Location.where({ organizationId: input.organizationId }).all().first();
      if (primaryLoc) {
        locationId = primaryLoc.id;
      }
    } else {
      const loc = await db.orm.public.Location.where({ id: locationId, organizationId: input.organizationId }).all().first();
      if (!loc) {
        return { error: 'Location does not belong to this organization.' };
      }
    }

    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId || null);
    if (!input.name.trim()) return { error: 'Item name is required.' };
    if (!(input.price >= 0)) return { error: 'Price must be zero or greater.' };

    const item = await db.orm.public.MenuItem.create({
      organizationId: input.organizationId,
      locationId: locationId ?? null,
      name: input.name.trim(),
      description: input.description ?? null,
      price: input.price,
      category: input.category.trim() || 'Mains',
      imageUrl: input.imageUrl ?? null,
      kitchenStation: input.kitchenStation ?? 'Main Kitchen',
      isAvailable: true,
    });

    // First menu item completes the onboarding step.
    const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();
    if (settings && !settings.hasMenu) {
      await db.orm.public.RestaurantSettings
        .where({ organizationId: input.organizationId })
        .update({ hasMenu: true });
    }

    try {
      safeRevalidatePath('/', 'layout');
    } catch {
      // Safe fallback when invoked in testing environments
    }
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error creating menu item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create menu item.' };
  }
}

export async function updateMenuItem(
  menuItemId: string,
  input: Partial<{
    name: string;
    description: string | null;
    price: number | string;
    locationId?: string | null;
    category: string;
    imageUrl: string | null;
    kitchenStation?: string | null;
    isAvailable?: boolean;
  }>,
) {
  try {
    const menuItem = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
    if (!menuItem) return { error: 'Menu item not found.' };
    await requireMembership(menuItem.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], menuItem.locationId);

    const updateData: {
      name?: string;
      description?: string | null;
      price?: number;
      category?: string;
      imageUrl?: string | null;
      kitchenStation?: string;
      isAvailable?: boolean;
      locationId?: string | null;
    } = {};

    if (input.name !== undefined) {
      const trimmed = String(input.name).trim();
      if (!trimmed) return { error: 'Item name cannot be empty.' };
      updateData.name = trimmed;
    }

    if (input.description !== undefined) {
      updateData.description = input.description ? String(input.description).trim() : null;
    }

    if (input.price !== undefined) {
      const parsedPrice = typeof input.price === 'string' ? parseFloat(input.price) : Number(input.price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return { error: 'Price must be zero or greater.' };
      }
      updateData.price = parsedPrice;
    }

    if (input.category !== undefined) {
      const trimmedCat = String(input.category).trim();
      if (!trimmedCat) return { error: 'Category cannot be empty.' };
      updateData.category = trimmedCat;
    }

    if (input.imageUrl !== undefined) {
      updateData.imageUrl = input.imageUrl ? String(input.imageUrl).trim() : null;
    }

    if (input.kitchenStation !== undefined) {
      updateData.kitchenStation = input.kitchenStation ? String(input.kitchenStation).trim() : 'Main Kitchen';
    }

    if (input.isAvailable !== undefined) {
      updateData.isAvailable = Boolean(input.isAvailable);
    }

    if (input.locationId !== undefined) {
      if (input.locationId) {
        const loc = await db.orm.public.Location.where({ id: input.locationId, organizationId: menuItem.organizationId }).all().first();
        if (!loc) {
          return { error: 'Location does not belong to this organization.' };
        }
        updateData.locationId = input.locationId;
      } else {
        updateData.locationId = null;
      }
    }

    await db.orm.public.MenuItem.where({ id: menuItemId }).update(updateData);
    const updated = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath('/food');
      revalidatePath('/workspaces/restaurantos/[slug]/management/menu');
    } catch {
      // Safe fallback when invoked in testing environments
    }
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating menu item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update menu item.' };
  }
}

/** 86 an item: flips availability so POS and CityFood stop selling it. */
export async function toggleMenuItemAvailability(menuItemId: string) {
  try {
    const menuItem = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
    if (!menuItem) return { error: 'Menu item not found.' };
    await requireMembership(menuItem.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN'], menuItem.locationId);

    const next = menuItem.isAvailable === false;
    await db.orm.public.MenuItem.where({ id: menuItemId }).update({ isAvailable: next });
    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath('/food');
      revalidatePath('/workspaces/restaurantos/[slug]/management/menu');
    } catch {
      // Safe fallback when invoked in testing environments
    }
    return { success: true, isAvailable: next };
  } catch (error) {
    console.error('Error toggling menu item availability:', error);
    return { error: error instanceof Error ? error.message : 'Failed to toggle availability.' };
  }
}

export async function deleteMenuItem(menuItemId: string) {
  try {
    const menuItem = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
    if (!menuItem) return { error: 'Menu item not found.' };
    await requireMembership(menuItem.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], menuItem.locationId);

    await db.orm.public.MenuItem.where({ id: menuItemId }).delete();
    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath('/food');
      revalidatePath('/workspaces/restaurantos/[slug]/management/menu');
    } catch {
      // Safe fallback when invoked in testing environments
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete menu item.' };
  }
}

// ---------------------------------------------------------------------------
// Addons, variants, combos
// ---------------------------------------------------------------------------

export async function createMenuItemAddon(input: {
  organizationId: string;
  menuItemId: string;
  name: string;
  price: number;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], (input as any).locationId || null);
    if (!input.name.trim()) return { error: 'Addon name is required.' };
    
    const menuItem = await db.orm.public.MenuItem.where({ id: input.menuItemId }).all().first();
    if (!menuItem || menuItem.organizationId !== input.organizationId) {
      return { error: 'Menu item not found in this organization.' };
    }

    const addon = await db.orm.public.MenuItemAddon.create({
      organizationId: input.organizationId,
      menuItemId: input.menuItemId,
      name: input.name.trim(),
      price: input.price,
      isAvailable: true,
    });
    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(addon));
  } catch (error) {
    console.error('Error creating addon:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create addon.' };
  }
}

export async function createMenuItemVariant(input: {
  organizationId: string;
  menuItemId: string;
  name: string;
  price: number;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], (input as any).locationId || null);
    if (!input.name.trim()) return { error: 'Variant name is required.' };
    
    const menuItem = await db.orm.public.MenuItem.where({ id: input.menuItemId }).all().first();
    if (!menuItem || menuItem.organizationId !== input.organizationId) {
      return { error: 'Menu item not found in this organization.' };
    }

    const variant = await db.orm.public.MenuItemVariant.create({
      organizationId: input.organizationId,
      menuItemId: input.menuItemId,
      name: input.name.trim(),
      price: input.price,
      isAvailable: true,
    });
    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(variant));
  } catch (error) {
    console.error('Error creating variant:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create variant.' };
  }
}

export async function createMenuItemCombo(input: {
  organizationId: string;
  name: string;
  description?: string;
  price: number;
  items: { menuItemId?: string; name: string; quantity?: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], (input as any).locationId || null);
    if (!input.name.trim()) return { error: 'Combo name is required.' };
    if (!(input.price >= 0)) return { error: 'Combo price must be zero or greater.' };
    if (input.items.length === 0) return { error: 'A combo needs at least one item.' };

    const menuItemIds = input.items.map(it => it.menuItemId).filter(Boolean) as string[];
    if (menuItemIds.length > 0) {
      // @ts-ignore
      const menuItems = await db.orm.public.MenuItem.where({ id: { in: menuItemIds } }).all();
      if (menuItems.length !== menuItemIds.length || menuItems.some(m => m.organizationId !== input.organizationId)) {
        return { error: 'One or more menu items do not belong to this organization.' };
      }
    }

    const combo = await db.orm.public.MenuItemCombo.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description ?? null,
      price: input.price,
      isAvailable: true,
    });
    for (const it of input.items) {
      await db.orm.public.MenuItemComboItem.create({
        comboId: combo.id,
        menuItemId: it.menuItemId ?? null,
        name: it.name.trim(),
        quantity: it.quantity ?? 1,
      });
    }
    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(combo));
  } catch (error) {
    console.error('Error creating combo:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create combo.' };
  }
}

export async function getMenuItemCombos(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const combos = await db.orm.public.MenuItemCombo.where({ organizationId }).all();
    const allComboItems: any[] = [];
    for (const c of combos) {
      const items = await db.orm.public.MenuItemComboItem.where({ comboId: c.id }).all();
      allComboItems.push(...items);
    }
    return JSON.parse(JSON.stringify(
      combos.map((c) => ({ ...c, items: allComboItems.filter((i: any) => i.comboId === c.id) })),
    ));
  } catch (error) {
    console.error('Error fetching combos:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Tables & floor plan (Full Service)
// ---------------------------------------------------------------------------

export async function getTables(organizationId: string, locationId?: string) {
  try {
    await requireMembership(organizationId);
    let q = db.orm.public.RestaurantTable.where({ organizationId });
    if (locationId) {
      q = q.where({ locationId });
    }
    const tables = await q.all();
    return JSON.parse(JSON.stringify(tables));
  } catch (error) {
    console.error('Error fetching tables:', error);
    return [];
  }
}

export async function createTable(input: { organizationId: string; locationId?: string; name: string; seats: number }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], (input as any).locationId || null);
    if (!input.name.trim()) return { error: 'Table name is required.' };
    const table = await db.orm.public.RestaurantTable.create({
      organizationId: input.organizationId,
      locationId: input.locationId ?? null,
      name: input.name.trim(),
      seats: input.seats > 0 ? input.seats : 4,
      status: 'available',
    });
    const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();
    if (settings && !settings.hasTables) {
      await db.orm.public.RestaurantSettings
        .where({ organizationId: input.organizationId })
        .update({ hasTables: true });
    }
    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(table));
  } catch (error) {
    console.error('Error creating table:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create table.' };
  }
}

export async function updateTableStatus(tableId: string, status: 'available' | 'occupied' | 'reserved') {
  try {
    const table = await db.orm.public.RestaurantTable.where({ id: tableId }).all().first();
    if (!table) return { error: 'Table not found.' };
    await requireMembership(table.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'WAITER'], table.locationId);
    await db.orm.public.RestaurantTable.where({ id: tableId }).update({ status });
    safeRevalidatePath('/', 'layout');
    return { success: true, status };
  } catch (error) {
    console.error('Error updating table status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update table.' };
  }
}

// ---------------------------------------------------------------------------
// Reservations (Full Service)
// ---------------------------------------------------------------------------

export async function getReservations(organizationId: string, locationId?: string) {
  try {
    await requireMembership(organizationId);
    let q = db.orm.public.RestaurantReservation.where({ organizationId });
    if (locationId) {
      q = q.where({ locationId });
    }
    const reservations = await q.all();
    return JSON.parse(JSON.stringify(reservations));
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
}

export async function createReservation(input: {
  organizationId: string;
  locationId?: string;
  tableId?: string;
  customerDataId?: string;
  customerName?: string;
  customerPhone?: string;
  partySize: number;
  scheduledAt: string;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'WAITER'], input.locationId);
    if (!(input.partySize > 0)) return { error: 'Party size must be at least 1.' };
    const scheduled = new Date(input.scheduledAt);
    if (isNaN(scheduled.getTime())) return { error: 'Invalid reservation date.' };

    if (input.customerDataId) {
      const customer = await db.orm.public.CustomerData.where({ id: input.customerDataId }).all().first();
      if (!customer) {
        return { error: 'Customer not found.' };
      }
      const relationship = await db.orm.public.Relationship.where({ id: customer.relationshipId }).all().first();
      if (!relationship || relationship.organizationId !== input.organizationId) {
        return { error: 'Customer does not belong to this organization.' };
      }
    }

    const reservation = await db.transaction(async (tx: any) => {
      if (input.tableId) {
        // 1. Lock the table row to serialize concurrent requests for this exact table
        const tableLock = await tx.execute(db.raw.sql`
          SELECT id FROM "restaurantTable"
          WHERE id = ${input.tableId}
            AND "organizationId" = ${input.organizationId}
          FOR UPDATE
        `.affectedCount().build());

        if (tableLock === 0) {
          throw new Error('Table not found or could not be locked.');
        }

        // 2. Check overlapping time windows while holding the table lock
        const windowMs = 60 * 60 * 1000; 
        const minTime = new Date(scheduled.getTime() - windowMs).toISOString();
        const maxTime = new Date(scheduled.getTime() + windowMs).toISOString();
        
        const overlaps = await tx.execute(db.raw.sql`
          SELECT id FROM "restaurantReservation"
          WHERE "tableId" = ${input.tableId}
            AND "status" IN ('pending', 'confirmed', 'seated')
            AND "scheduledAt" > ${minTime}::timestamp
            AND "scheduledAt" < ${maxTime}::timestamp
        `.affectedCount().build());
        
        if (overlaps > 0) {
          throw new Error('Table is already reserved for this time block.');
        }
      }

      return await tx.orm.public.RestaurantReservation.create({
        organizationId: input.organizationId,
        locationId: input.locationId ?? null,
        tableId: input.tableId ?? null,
        customerDataId: input.customerDataId ?? null,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        partySize: input.partySize,
        scheduledAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(scheduled.getTime()),
        status: 'pending',
        notes: input.notes ?? null,
      });
    });

    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(reservation));
  } catch (error) {
    console.error('Error creating reservation:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create reservation.' };
  }
}

export async function updateReservationStatus(
  reservationId: string,
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled',
) {
  try {
    const reservation = await db.orm.public.RestaurantReservation
      .where({ id: reservationId })
      .all()
      .first();
    if (!reservation) return { error: 'Reservation not found.' };
    await requireMembership(reservation.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'WAITER'], reservation.locationId);

    await db.orm.public.RestaurantReservation.where({ id: reservationId }).update({ status });
    safeRevalidatePath('/', 'layout');
    return { success: true, status };
  } catch (error) {
    console.error('Error updating reservation status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update reservation.' };
  }
}

// ---------------------------------------------------------------------------
// POS orders & Kitchen Display (all styles)
// ---------------------------------------------------------------------------

async function enrichOrders(organizationId: string, orders: any[]) {
  const menuItems = await db.orm.public.MenuItem.where({ organizationId }).all();
  return Promise.all(orders.map(async (o: any) => {
    const items = await db.orm.public.OrderItem.where({ orderId: o.id }).all();
    let customerName: string | null = null;
    if (o.customerDataId) {
      const cd = await db.orm.public.CustomerData.where({ id: o.customerDataId }).all().first();
      if (cd) {
        const rel = await db.orm.public.Relationship.where({ id: cd.relationshipId }).all().first();
        if (rel) {
          const person = await db.orm.public.Person.where({ id: rel.personId }).all().first();
          customerName = person ? `${person.firstName} ${person.lastName}`.trim() : 'Unknown';
        }
      }
    }
    let tableName: string | null = null;
    if (o.tableId) {
      const t = await db.orm.public.RestaurantTable.where({ id: o.tableId }).all().first();
      tableName = t?.name ?? null;
    }
    return {
      ...o,
      createdAt: o.createdAt.toString ? o.createdAt.toString() : o.createdAt,
        kitchenStartedAt: o.kitchenStartedAt ? o.kitchenStartedAt.toString() : null,
        kitchenCompletedAt: o.kitchenCompletedAt ? o.kitchenCompletedAt.toString() : null,
      customerName,
      tableName,
      items: items.map((i: any) => ({
        ...i,
        itemName: menuItems.find((m) => m.id === i.menuItemId)?.name ?? 'Unknown',
          kitchenStation: menuItems.find((m) => m.id === i.menuItemId)?.kitchenStation ?? 'Main Kitchen',
          kitchenStatus: i.kitchenStatus,
      })),
    };
  }));
}

export async function getOrders(organizationId: string, options?: { status?: string; limit?: number; locationId?: string }) {
  try {
    await requireMembership(organizationId);
    const all = await db.orm.public.RestaurantOrder.where(options?.locationId ? { organizationId, locationId: options.locationId } : { organizationId }).all();
    let orders = options?.status ? all.filter((o: any) => o.status === options.status) : all;
    orders = [...orders].sort((a: any, b: any) =>
      new Date(b.createdAt.toString()).getTime() - new Date(a.createdAt.toString()).getTime());
    if (options?.limit) orders = orders.slice(0, options.limit);
    return JSON.parse(JSON.stringify(await enrichOrders(organizationId, orders)));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

/** Live kitchen tickets: unpaid + in-progress orders, oldest first. */
export async function getKitchenTickets(organizationId: string, locationId?: string) {
  try {
    await requireMembership(organizationId);
    const all = await db.orm.public.RestaurantOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();
    const active = all.filter((o: any) =>
      ['PENDING', 'PREPARING', 'READY', 'DELIVERING'].includes(o.status));
    const sorted = active.sort((a: any, b: any) =>
      new Date(a.createdAt.toString()).getTime() - new Date(b.createdAt.toString()).getTime());
    return JSON.parse(JSON.stringify(await enrichOrders(organizationId, sorted)));
  } catch (error) {
    console.error('Error fetching kitchen tickets:', error);
    return [];
  }
}

export async function createPosOrder(input: {
  organizationId: string;
  items: { menuItemId: string; quantity: number; notes?: string; variantId?: string; modifierOptionIds?: string[] }[];
  type?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
    locationId?: string;
  tableId?: string;
  paymentMethod?: 'WALLET' | 'CASH' | 'POS' | 'TRANSFER';
  customerDataId?: string;
  shiftId?: string;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER'], input.locationId);
    if (input.items.length === 0) return { error: 'No items on the order.' };

    // Resolve menu items in ONE org-scoped fetch and refuse any item that does
    // not belong to this kitchen ΓÇö a cross-tenant corruption guard (mirrors
    // retail.ts createOrder).
    
      // Enforce active shift
      let activeShift: any = null;
      if (input.shiftId) {
        activeShift = await db.orm.public.RestaurantShift.where({
          id: input.shiftId,
          organizationId: input.organizationId,
          status: 'OPEN'
        }).all().first();
      }

      if (!activeShift && input.locationId) {
        activeShift = await db.orm.public.RestaurantShift.where({
          organizationId: input.organizationId,
          locationId: input.locationId,
          status: 'OPEN'
        }).all().first();
      }

      if (!activeShift) {
        activeShift = await db.orm.public.RestaurantShift.where({
          organizationId: input.organizationId,
          locationId: null,
          status: 'OPEN'
        }).all().first();
      }

      if (!activeShift) {
        activeShift = await db.orm.public.RestaurantShift.where({
          organizationId: input.organizationId,
          status: 'OPEN'
        }).all().first();
      }

      if (!activeShift) {
        return { error: 'No active shift. You must open a shift before processing orders.' };
      }

      const effectiveLocationId = input.locationId ?? activeShift.locationId ?? null;
      const orgMenu = await db.orm.public.MenuItem.where({ organizationId: input.organizationId }).all();
    const itemById = new Map(orgMenu.map((m: any) => [m.id, m]));

    const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();
      const lineItems: any[] = [];
      let subtotal = 0;
      for (const item of input.items) {
        const menuItem = itemById.get(item.menuItemId);
        if (!menuItem) return { error: "An item on the order is not on this kitchen's menu." };
        if (menuItem.isAvailable === false) return { error: `86'd item: ${menuItem.name} is unavailable.` };
        const quantity = item.quantity;
        if (!(quantity > 0)) return { error: 'Item quantities must be greater than zero.' };
        
        let unitPrice = menuItem.price;
        let variantName: string | null = null;
        if (item.variantId) {
          const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
          if (variant) {
            unitPrice = variant.price;
            variantName = variant.name;
          }
        }

        const modifiers: any[] = [];
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

        
        // Validate Modifiers
        if (settings?.enableModifiers) {
          const links = await db.orm.public.MenuItemModifierGroup.where({ menuItemId: menuItem.id }).all();
          const requiredGroups = new Set();
          for (const link of links) {
            const group = await db.orm.public.ModifierGroup.where({ id: link.modifierGroupId }).all().first();
            if (group && group.isActive && group.isRequired) {
              requiredGroups.add(group.id);
            }
          }

          const selectedOptionCounts = new Map<string, number>();

          if (item.modifierOptionIds && item.modifierOptionIds.length > 0) {
            const opts = [];
            for (const id of item.modifierOptionIds) {
               const o = await db.orm.public.ModifierOption.where({ id }).all().first();
               if (o) opts.push(o);
            }
            
            for (const optId of item.modifierOptionIds) {
              const opt = opts.find((o: any) => o.id === optId);
              if (!opt || !opt.isActive) return { error: `Invalid or inactive modifier selected.` };
              
              const groupId = opt.modifierGroupId;
              selectedOptionCounts.set(groupId, (selectedOptionCounts.get(groupId) || 0) + 1);

              unitPrice += opt.priceDelta;
              modifiers.push({ optionId: opt.id, name: opt.name, priceDelta: opt.priceDelta });

              if (opt.inventoryItemId && opt.inventoryQuantity) {
                const inv = await db.orm.public.RestaurantInventoryItem.where({ id: opt.inventoryItemId }).all().first();
                if (inv) unitCost += inv.cost * opt.inventoryQuantity;
              }
            }
          }

          // Check min/max and required
          for (const link of links) {
            const group = await db.orm.public.ModifierGroup.where({ id: link.modifierGroupId }).all().first();
            if (!group || !group.isActive) continue;

            const count = selectedOptionCounts.get(group.id) || 0;
            if (group.isRequired && count === 0) return { error: `Missing required modifier selection for ${group.name}.` };
            if (group.minSelections > 0 && count < group.minSelections) return { error: `Please select at least ${group.minSelections} for ${group.name}.` };
            if (group.maxSelections && group.maxSelections > 0 && count > group.maxSelections) return { error: `Too many selections for ${group.name} (max ${group.maxSelections}).` };
            
            requiredGroups.delete(group.id);
          }

          if (requiredGroups.size > 0) return { error: `Missing required modifier selection.` };
        } else if (item.modifierOptionIds && item.modifierOptionIds.length > 0) {
           return { error: 'Modifiers are not enabled for this restaurant.' };
        }


        lineItems.push({ 
          menuItemId: menuItem.id, 
          menuItemName: menuItem.name,
          variantId: item.variantId ?? null,
          variantName,
          quantity, 
          unitPrice, 
          notes: item.notes ?? null,
          modifiers 
        });
        subtotal += unitPrice * quantity;
      }

    // Settings: tax, service charge, next call-out number. (moved up)
    const taxRate = settings?.taxRate ? settings.taxRate / 100 : 0;
    const serviceChargeRate = settings?.serviceCharge ? settings.serviceCharge / 100 : 0;
    const taxAmount = subtotal * taxRate;
    const serviceChargeAmount = subtotal * serviceChargeRate;
    const totalAmount = subtotal + taxAmount + serviceChargeAmount;

    // Table (dine-in): must belong to this org.
    let tableId: string | null = null;
    if (input.tableId) {
      const table = await db.orm.public.RestaurantTable
        .where({ id: input.tableId, organizationId: input.organizationId })
        .all()
        .first();
      if (!table) return { error: 'Table not found for this restaurant.' };
      tableId = table.id;
    }

    // Sequential call-out number, assigned atomically with the order.
    const orderNumber = (settings?.nextOrderNumber ?? 1);

    const paid = !!input.paymentMethod;
    const order = await db.transaction(async (tx: any) => {
      const created = await tx.orm.public.RestaurantOrder.create({
        organizationId: input.organizationId,
        locationId: effectiveLocationId,
        customerDataId: input.customerDataId ?? null,
        totalAmount,
        shiftId: activeShift.id,
          type: input.type ?? 'DINE_IN',
        tableId,
        orderNumber,
        paymentStatus: paid ? 'COMPLETED' : 'PENDING',
        paymentMethod: input.paymentMethod ?? null,
        paidAt: paid ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) : null,
        kitchenStartedAt: (paid && settings?.serviceStyle !== 'COUNTER') ? toInstant() : null,
        status: paid ? (settings?.serviceStyle === 'COUNTER' ? 'COMPLETED' : 'PREPARING') : 'PENDING',
        servedByMembershipId: membership.id,
      });
      if (tableId) {
        await tx.orm.public.RestaurantTable.where({ id: tableId }).update({ status: 'occupied' });
      }
      for (const line of lineItems) {
          const oi = await tx.orm.public.OrderItem.create({
            orderId: created.id,
            menuItemId: line.menuItemId,
            menuItemName: line.menuItemName,
            variantId: line.variantId,
            variantName: line.variantName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: line.unitCost || 0,
            notes: line.notes,
          });
          if (line.modifiers && line.modifiers.length > 0) {
            for (const mod of line.modifiers) {
              await tx.orm.public.OrderItemModifier.create({
                orderItemId: oi.id,
                modifierOptionId: mod.optionId,
                name: mod.name,
                priceDelta: mod.priceDelta
              });
            }
          }
        }
      // Advance the call-out counter (same transaction as the order).
      await tx.orm.public.RestaurantSettings
          .where({ organizationId: input.organizationId })
          .update({ nextOrderNumber: orderNumber + 1 });
        
        if (created.status === 'COMPLETED') {
          await consumeInventoryForOrder(tx, created.id, input.organizationId, settings);
        }
        
        return created;
    });

    safeRevalidatePath('/', 'layout');

    if (input.customerDataId) {
      const personId = await personIdForCustomerData(input.customerDataId);
      if (personId) {
        await notifyPerson(personId, {
          type: 'FOOD_ORDER_CONFIRMED',
          title: 'Food Order Received',
          body: `Your food order #${orderNumber} has been received.`,
          href: '/orders',
        });
      }
    }

    // Trigger real-time Pusher event for kitchen display
    pusherServer.trigger(`org-${input.organizationId}`, 'new-kitchen-ticket', {
      orderId: order.id,
      orderNumber,
      totalAmount,
    }).catch(() => {});

    return { success: true, orderId: order.id, orderNumber, totalAmount };
  } catch (error) {
    console.error('Error creating POS order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to place order.' };
  }
}

/** KDS / counter mutation: move an order through its status flow. */
export async function processRestaurantPayment(orderId: string, paymentMethod: 'CASH'|'POS'|'WALLET'|'TRANSFER') {
  try {
    return await db.transaction(async (tx: any) => {
      const lockedCount = await tx.execute(db.raw.sql`SELECT id FROM "restaurantOrder" WHERE id = ${orderId} FOR UPDATE`.affectedCount().build());
      if (lockedCount === 0) throw new Error('Order not found.');
      
      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], order.locationId);

      if (order.paymentStatus === 'PAID' || order.paymentStatus === 'COMPLETED') throw new Error('Order is already paid.');
      if (order.status === 'CANCELLED') throw new Error('Cannot pay for a cancelled order.');

      await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({
        paymentStatus: 'COMPLETED',
        paymentMethod: paymentMethod,
        paidAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now())
      });

      return { success: true };
    });
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED',
) {
  try {
    const updatedOrder = await db.transaction(async (tx: any) => {
      const lockedCount = await tx.execute(db.raw.sql`SELECT id FROM "restaurantOrder" WHERE id = ${orderId} FOR UPDATE`.affectedCount().build());
      if (lockedCount === 0) throw new Error('Order not found.');

      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'], order.locationId);

      if (order.status === 'CANCELLED' && status !== 'CANCELLED') throw new Error('Cannot change status of a cancelled order.');

      // Update timestamps
      let kitchenStartedAt = order.kitchenStartedAt;
      let kitchenCompletedAt = order.kitchenCompletedAt;
      if (status === 'PREPARING' && !kitchenStartedAt) kitchenStartedAt = toInstant();
      if (status === 'READY' && !kitchenCompletedAt) kitchenCompletedAt = toInstant();


      // P0-A: Sales -> Inventory Consumption (Transactional, Idempotent)
      if (status === 'COMPLETED' && !order.inventoryConsumed) {
          const settings = await tx.orm.public.RestaurantSettings.where({ organizationId: order.organizationId }).all().first();
          await consumeInventoryForOrder(tx, orderId, order.organizationId, settings);
        }

      // Reversal on CANCELLED
      if (status === 'CANCELLED' && order.inventoryConsumed) {
          const settings = await tx.orm.public.RestaurantSettings.where({ organizationId: order.organizationId }).all().first();
          await reverseInventoryForOrder(tx, orderId, order.organizationId, settings);
        }

      // Reversal of payment status (if cancelling an already paid order)
      if (status === 'CANCELLED' && (order.paymentStatus === 'PAID' || order.paymentStatus === 'COMPLETED')) {
         await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ paymentStatus: 'REFUNDED' });
      }

      if (order.tableId && (status === 'COMPLETED' || status === 'CANCELLED')) {
        const tableOrders = await tx.orm.public.RestaurantOrder.where({ tableId: order.tableId }).all();
        const otherBusyOrders = tableOrders.filter((o: any) => o.id !== orderId && ['PENDING', 'PREPARING', 'READY'].includes(o.status));
        if (otherBusyOrders.length === 0) {
          await tx.orm.public.RestaurantTable.where({ id: order.tableId }).update({ status: 'available' });
        }
      }

      await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ status, kitchenStartedAt, kitchenCompletedAt });
      return await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
    });

    try {
        const { revalidatePath } = require('next/cache');
        safeRevalidatePath('/', 'layout');
    } catch(e){}

    if (updatedOrder.customerDataId) {
      const personId = await personIdForCustomerData(updatedOrder.customerDataId);
      if (personId) {
        const statusTitles: Record<string, string> = {
          PREPARING: 'Kitchen Preparing Your Meal',
          READY: 'Order Ready for Pickup',
          DELIVERING: 'Order Out for Delivery',
          COMPLETED: 'Order Completed',
          CANCELLED: 'Order Cancelled',
        };
        await notifyPerson(personId, {
          type: 'FOOD_ORDER_CONFIRMED',
          title: statusTitles[status] || `Order Status: ${status}`,
          body: `Your food order #${updatedOrder.orderNumber ?? updatedOrder.id.slice(0, 8)} is now ${status.toLowerCase()}.`,
          href: `/orders`,
        });
      }
    }

    pusherServer.trigger(`org-${updatedOrder.organizationId}`, 'ticket-status-changed', {
      orderId,
      status,
      orderNumber: updatedOrder.orderNumber,
    }).catch(() => {});

    return { success: true, status };
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return { error: error.message || 'Failed to update order status.' };
  }
}
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Grand Inventory & Production Engine Actions
// ---------------------------------------------------------------------------

export async function getRecipes(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const recipes = await db.orm.public.RestaurantRecipe.where({ organizationId }).all();
    const ingredients = await db.orm.public.RestaurantRecipeIngredient.all(); // Naive fetch for now
    
    // Attach ingredients
    const result = recipes.map((r: any) => ({
      ...r,
      ingredients: ingredients.filter((i: any) => i.recipeId === r.id)
    }));
    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return [];
  }
}


export async function createRecipe(input: {
  organizationId: string;
  name: string;
  yieldQuantity: number;
  instructions?: string;
  producedItemId?: string;
  menuItemId?: string;
  ingredients?: { itemId: string; quantity: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

    // Ensure recipes and inventory capabilities are enabled
    const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();
    if (!settings) {
      await db.orm.public.RestaurantSettings.create({
        organizationId: input.organizationId,
        enableRecipes: true,
        enableInventory: true,
      });
    } else if (!settings.enableRecipes || !settings.enableInventory) {
      await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).update({
        enableRecipes: true,
        enableInventory: true,
      });
    }

    if (!input.name || !input.name.trim()) {
      return { error: 'Recipe name is required.' };
    }
    const yieldQty = Number(input.yieldQuantity) > 0 ? Number(input.yieldQuantity) : 1;

    let targetLocationId: string | null | undefined = undefined;
    
    if (input.producedItemId) {
       const p = await db.orm.public.RestaurantInventoryItem.where({ id: input.producedItemId }).all().first();
       if (!p || p.organizationId !== input.organizationId) return { error: "Invalid produced item." };
       targetLocationId = p.locationId;
    }

    if (input.menuItemId) {
       const menuItem = await db.orm.public.MenuItem.where({ id: input.menuItemId }).all().first();
       if (!menuItem || menuItem.organizationId !== input.organizationId) {
         return { error: "Selected menu item does not belong to this restaurant." };
       }
       const existing = await db.orm.public.RestaurantRecipe.where({ menuItemId: input.menuItemId }).all().first();
       if (existing) {
         return { error: `Menu item "${menuItem.name}" already has an assigned recipe (${existing.name}).` };
       }
    }
    
    const ingredients = Array.isArray(input.ingredients) ? input.ingredients : [];
    for (const ing of ingredients) {
       const i = await db.orm.public.RestaurantInventoryItem.where({ id: ing.itemId }).all().first();
       if (!i || i.organizationId !== input.organizationId) return { error: "Invalid ingredient item." };
       
       if (targetLocationId === undefined) {
         targetLocationId = i.locationId;
       } else if (targetLocationId && i.locationId && targetLocationId !== i.locationId) {
         return { error: "Cross-location mix detected. All ingredients and produced items must belong to the same location." };
       }
    }

    const created = await db.transaction(async (tx: any) => {
      // 1. Create the recipe
      const recipe = await tx.orm.public.RestaurantRecipe.create({
        organizationId: input.organizationId,
        name: input.name.trim(),
        yieldQuantity: yieldQty,
        instructions: input.instructions?.trim() || null,
        menuItemId: input.menuItemId || null,
      });

      // 2. Add ingredients
      for (const ing of ingredients) {
        if (Number(ing.quantity) > 0) {
          await tx.orm.public.RestaurantRecipeIngredient.create({
            recipeId: recipe.id,
            itemId: ing.itemId,
            quantity: Number(ing.quantity),
          });
        }
      }
      
      // 3. Link produced item if given
      if (input.producedItemId) {
        await tx.orm.public.RestaurantInventoryItem.where({ id: input.producedItemId }).update({
          recipeId: recipe.id
        });
      }

      return JSON.parse(JSON.stringify(recipe));
    });

    return { ...created, success: true, recipe: created };
  } catch (error: any) {
    console.error('Error creating recipe:', error);
    return { error: error.message || 'Failed to create recipe' };
  }
}

export async function deleteRecipe(organizationId: string, recipeId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
    const recipe = await db.orm.public.RestaurantRecipe.where({ id: recipeId }).all().first();
    if (!recipe || recipe.organizationId !== organizationId) {
      return { error: 'Recipe not found or does not belong to this restaurant.' };
    }

    await db.transaction(async (tx: any) => {
      // 1. Delete associated ingredients
      const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId }).all();
      for (const ing of ingredients) {
        await tx.orm.public.RestaurantRecipeIngredient.where({ id: ing.id }).delete();
      }

      // 2. Unlink any inventory items produced by this recipe
      const producedItems = await tx.orm.public.RestaurantInventoryItem.where({ recipeId }).all();
      for (const p of producedItems) {
        await tx.orm.public.RestaurantInventoryItem.where({ id: p.id }).update({ recipeId: null });
      }

      // 3. Delete the recipe
      await tx.orm.public.RestaurantRecipe.where({ id: recipeId }).delete();
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return { error: error.message || 'Failed to delete recipe' };
  }
}

export async function createProductionRun(input: {
  organizationId: string;
  recipeId: string;
  batchMultiplier: number;
  actualYield: number;
}) {
  try {
    const mem = await requireMembership(input.organizationId);
    
    return await db.transaction(async (tx: any) => {
      // 1. Fetch recipe and ingredients
      const recipe = await tx.orm.public.RestaurantRecipe.findUnique({
        where: { id: input.recipeId }
      });
      if (!recipe) throw new Error("Recipe not found");
      
      const ingredients = await tx.orm.public.RestaurantRecipeIngredient.where({ recipeId: recipe.id }).all();
      
      // Calculate total cost of materials used
      let totalCost = 0;

      // 2. Deduct Raw Materials
      for (const ing of ingredients) {
        const requiredQty = ing.quantity * input.batchMultiplier;
        const item = await tx.orm.public.RestaurantInventoryItem.findUnique({
          where: { id: ing.itemId }
        });
        if (!item || item.quantity < requiredQty) {
          throw new Error(`Not enough stock for ${item?.name || 'an ingredient'}. Need ${requiredQty}.`);
        }
        
        const costOfIng = item.cost * requiredQty;
        totalCost += costOfIng;

        await tx.orm.public.RestaurantInventoryItem.update({
          id: item.id,
          quantity: item.quantity - requiredQty,
        });
        
        await tx.orm.public.RestaurantStockMovement.create({
          organizationId: input.organizationId,
          itemId: item.id,
          type: 'PRODUCTION_USAGE',
          quantity: -requiredQty,
          note: `Production Run for Recipe: ${recipe.name}`
        });
      }
      
      // 3. Create the Production Run Record
      const run = await tx.orm.public.RestaurantProductionRun.create({
        organizationId: input.organizationId,
        recipeId: input.recipeId,
        batchMultiplier: input.batchMultiplier,
        expectedYield: recipe.yieldQuantity * input.batchMultiplier,
        actualYield: input.actualYield,
        totalCost: totalCost,
        recordedById: mem.membership.id
      });
      
      // 4. Increase Finished Goods Stock
      const producedItem = await tx.orm.public.RestaurantInventoryItem.findFirst({
        where: { recipeId: recipe.id }
      });
      
      if (producedItem) {
        // Distribute total cost to the produced item
        const unitCost = totalCost / input.actualYield;
        
        await tx.orm.public.RestaurantInventoryItem.update({
          id: producedItem.id,
          quantity: producedItem.quantity + input.actualYield,
          // Moving average cost or just override? We will just override for MVP
          cost: unitCost,
        });
        
        await tx.orm.public.RestaurantStockMovement.create({
          organizationId: input.organizationId,
          itemId: producedItem.id,
          type: 'PRODUCTION_YIELD',
          delta: input.actualYield,
          note: `Production Run: ${run.id}`
        });
      }

      return JSON.parse(JSON.stringify(run));
    });
  } catch (error: any) {
    console.error('Error creating production run:', error);
    throw new Error(error.message || 'Failed to create production run');
  }
}

export async function getProductionRuns(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const runs = await db.orm.public.RestaurantProductionRun.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(runs));
  } catch (error) {
    console.error('Error fetching production runs:', error);
    return [];
  }
}

export async function getInventoryItems(organizationId: string, locationId?: string) {
  try {
    await requireMembership(organizationId);
    let q = db.orm.public.RestaurantInventoryItem.where({ organizationId });
    if (locationId) {
      q = q.where({ locationId });
    }
    const items = await q.all();
    return JSON.parse(JSON.stringify(items));
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return [];
  }
}

export async function createInventoryItem(input: {
  organizationId: string;
  name: string;
  unit: string;
  quantity: number;
  lowStockLevel: number;
  cost?: number;
  type?: 'RAW_MATERIAL' | 'SUB_ASSEMBLY' | 'FINISHED_GOOD';
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);
    await requireRestaurantCapability(input.organizationId, 'enableInventory');
    if (!input.name.trim()) return { error: 'Item name is required.' };

    const item = await db.orm.public.RestaurantInventoryItem.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      unit: input.unit.trim() || 'unit',
      quantity: input.quantity >= 0 ? input.quantity : 0,
      lowStockLevel: input.lowStockLevel >= 0 ? input.lowStockLevel : 5,
      cost: input.cost ?? 0,
      type: input.type ?? 'RAW_MATERIAL',
    });
    if (item.quantity > 0) {
      await db.orm.public.RestaurantStockMovement.create({
        organizationId: input.organizationId,
        itemId: item.id,
        delta: item.quantity,
        note: 'Initial stock',
      });
    }
    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create inventory item.' };
  }
}

export const DEFAULT_RESTAURANT_UNITS = [
  'kg',
  'g',
  'mg',
  'L',
  'ml',
  'cl',
  'pcs',
  'portion',
  'slice',
  'plate',
  'cup',
  'tbsp',
  'tsp',
  'pack',
  'box',
  'bottle',
  'can',
  'carton',
  'crate',
  'bunch',
  'bag',
  'loaf',
  'dozen',
  'tin',
  'jar',
  'tub',
  'tray',
] as const;

export async function getOrganizationUnits(organizationId: string): Promise<string[]> {
  try {
    await requireMembership(organizationId);

    // 1. Fetch customUnits from RetailSettings if present
    const settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    let savedUnits: string[] = [];
    if (settings?.customUnits) {
      try {
        const parsed = JSON.parse(settings.customUnits);
        if (Array.isArray(parsed)) {
          savedUnits = parsed.map((u: any) => String(u || '').trim()).filter(Boolean);
        }
      } catch {
        savedUnits = [];
      }
    }

    // 2. Fetch all distinct units currently in use by RestaurantInventoryItem
    const items = await db.orm.public.RestaurantInventoryItem.where({ organizationId }).all();
    const usedUnits = items.map((i: any) => String(i.unit || '').trim()).filter(Boolean);

    // 3. Merge DEFAULT_RESTAURANT_UNITS + savedUnits + usedUnits with deduplication
    const merged = Array.from(new Set([
      ...DEFAULT_RESTAURANT_UNITS,
      ...savedUnits,
      ...usedUnits
    ]));

    return merged;
  } catch (error) {
    console.error('Error fetching organization units:', error);
    return [...DEFAULT_RESTAURANT_UNITS];
  }
}

export async function getUnitsWithUsage(organizationId: string): Promise<{ unit: string; count: number; isCustom: boolean }[]> {
  try {
    await requireMembership(organizationId);
    const allUnits = await getOrganizationUnits(organizationId);
    const items = await db.orm.public.RestaurantInventoryItem.where({ organizationId }).all();

    const counts: Record<string, number> = {};
    for (const item of items) {
      const u = String(item.unit || '').trim();
      counts[u] = (counts[u] || 0) + 1;
    }

    const defaultSet = new Set(DEFAULT_RESTAURANT_UNITS.map(u => u.toLowerCase()));

    return allUnits.map(unit => ({
      unit,
      count: counts[unit] || 0,
      isCustom: !defaultSet.has(unit.toLowerCase()),
    }));
  } catch (error) {
    console.error('Error fetching units with usage:', error);
    return DEFAULT_RESTAURANT_UNITS.map(unit => ({ unit, count: 0, isCustom: false }));
  }
}

export async function createUnitOfMeasure(organizationId: string, unit: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'INVENTORY_STAFF']);
    const trimmed = String(unit || '').trim();
    if (!trimmed) {
      return { error: 'Unit name is required.' };
    }
    if (trimmed.length > 25) {
      return { error: 'Unit name must be 25 characters or fewer.' };
    }

    const currentUnits = await getOrganizationUnits(organizationId);
    if (currentUnits.some(u => u.toLowerCase() === trimmed.toLowerCase())) {
      return { error: `Unit "${trimmed}" already exists.` };
    }

    const updatedUnits = [...currentUnits, trimmed];

    // Persist in RetailSettings
    const settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    if (!settings) {
      await db.orm.public.RetailSettings.create({
        organizationId,
        customUnits: JSON.stringify(updatedUnits),
      });
    } else {
      await db.orm.public.RetailSettings.where({ organizationId }).update({
        customUnits: JSON.stringify(updatedUnits),
      });
    }

    safeRevalidatePath('/', 'layout');
    return { success: true, units: updatedUnits };
  } catch (error: any) {
    console.error('Error creating unit of measure:', error);
    return { error: error.message || 'Failed to create unit of measure' };
  }
}

export async function updateUnitOfMeasure(organizationId: string, oldUnit: string, newUnit: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN', 'INVENTORY_STAFF']);
    const oldTrimmed = String(oldUnit || '').trim();
    const newTrimmed = String(newUnit || '').trim();

    if (!newTrimmed) {
      return { error: 'New unit name is required.' };
    }
    if (newTrimmed.length > 25) {
      return { error: 'New unit name must be 25 characters or fewer.' };
    }
    if (oldTrimmed.toLowerCase() === newTrimmed.toLowerCase()) {
      return { success: true, units: await getOrganizationUnits(organizationId) };
    }

    const currentUnits = await getOrganizationUnits(organizationId);
    const updatedUnits = currentUnits.map(u => u.toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : u);
    if (!updatedUnits.some(u => u.toLowerCase() === newTrimmed.toLowerCase())) {
      updatedUnits.push(newTrimmed);
    }
    const deduplicated = Array.from(new Set(updatedUnits));

    // 1. Update RetailSettings
    const settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    if (!settings) {
      await db.orm.public.RetailSettings.create({
        organizationId,
        customUnits: JSON.stringify(deduplicated),
      });
    } else {
      await db.orm.public.RetailSettings.where({ organizationId }).update({
        customUnits: JSON.stringify(deduplicated),
      });
    }

    // 2. Cascade rename to all inventory items using oldUnit
    const matchingItems = await db.orm.public.RestaurantInventoryItem.where({ organizationId, unit: oldTrimmed }).all();
    for (const item of matchingItems) {
      await db.orm.public.RestaurantInventoryItem.where({ id: item.id }).update({ unit: newTrimmed });
    }

    safeRevalidatePath('/', 'layout');
    return { success: true, units: deduplicated, updatedItemsCount: matchingItems.length };
  } catch (error: any) {
    console.error('Error updating unit of measure:', error);
    return { error: error.message || 'Failed to update unit of measure' };
  }
}

export async function deleteUnitOfMeasure(organizationId: string, unit: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
    const trimmed = String(unit || '').trim();

    // Check if any inventory item in this organization is actively using this unit
    const matchingItems = await db.orm.public.RestaurantInventoryItem.where({ organizationId, unit: trimmed }).all();
    if (matchingItems.length > 0) {
      return {
        error: `Cannot delete unit "${trimmed}": it is currently assigned to ${matchingItems.length} inventory item(s). Please update those items first.`
      };
    }

    const currentUnits = await getOrganizationUnits(organizationId);
    const filtered = currentUnits.filter(u => u.toLowerCase() !== trimmed.toLowerCase());

    const settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    if (settings) {
      await db.orm.public.RetailSettings.where({ organizationId }).update({
        customUnits: JSON.stringify(filtered),
      });
    }

    safeRevalidatePath('/', 'layout');
    return { success: true, units: filtered };
  } catch (error: any) {
    console.error('Error deleting unit of measure:', error);
    return { error: error.message || 'Failed to delete unit of measure' };
  }
}

export async function updateInventoryItem(
  itemId: string,
  input: Partial<{
    name: string;
    unit: string;
    lowStockLevel: number;
    cost: number;
    type: 'RAW_MATERIAL' | 'SUB_ASSEMBLY' | 'FINISHED_GOOD';
  }>,
) {
  try {
    const item = await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    if (!item) return { error: 'Inventory item not found.' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF'], item.locationId);

    const updateData: any = {};
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) return { error: 'Item name cannot be empty.' };
      updateData.name = trimmed;
    }
    if (input.unit !== undefined) {
      const trimmedUnit = input.unit.trim();
      if (!trimmedUnit) return { error: 'Unit cannot be empty.' };
      updateData.unit = trimmedUnit;
    }
    if (input.lowStockLevel !== undefined) {
      updateData.lowStockLevel = Math.max(0, Number(input.lowStockLevel) || 0);
    }
    if (input.cost !== undefined) {
      updateData.cost = Math.max(0, Number(input.cost) || 0);
    }
    if (input.type !== undefined) {
      updateData.type = input.type;
    }

    await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).update(updateData);
    const updated = await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    safeRevalidatePath('/', 'layout');
    return { success: true, item: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update inventory item.' };
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    const item = await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    if (!item) return { error: 'Inventory item not found.' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], item.locationId);

    // 1. Safety check: is item used in any recipes?
    const usedInRecipes = await db.orm.public.RestaurantRecipeIngredient.where({ itemId }).all();
    if (usedInRecipes.length > 0) {
      return {
        error: `Cannot delete "${item.name}": it is used in ${usedInRecipes.length} recipe ingredient(s). Please remove it from recipes first.`
      };
    }

    // 2. Unlink any menu items referencing this inventory item
    const linkedMenuItems = await db.orm.public.MenuItem.where({ inventoryItemId: itemId }).all();
    for (const m of linkedMenuItems) {
      await db.orm.public.MenuItem.where({ id: m.id }).update({ inventoryItemId: null });
    }

    // 3. Delete stock movements and the inventory item
    const movements = await db.orm.public.RestaurantStockMovement.where({ itemId }).all();
    for (const mov of movements) {
      await db.orm.public.RestaurantStockMovement.where({ id: mov.id }).delete();
    }

    await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).delete();
    safeRevalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete inventory item.' };
  }
}

/** Restock or record usage ΓÇö every change lands in the movement audit trail. */
export async function adjustStock(itemId: string, delta: number, note?: string) {
  try {
    const item = await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    if (!item) return { error: 'Inventory item not found.' };
    const { membership } = await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF', 'KITCHEN']);
    if (!(delta !== 0)) return { error: 'Adjustment must be non-zero.' };

    const next = await db.transaction(async (tx: any) => {
      // Re-read item inside transaction for concurrency
              const updatedCount = await tx.execute(db.raw.sql`UPDATE "restaurantInventoryItem" SET "quantity" = "quantity" + ${delta} WHERE id = ${itemId} AND "quantity" + ${delta} >= 0`.affectedCount().build());
        if (updatedCount === 0) {
          throw new Error('Stock cannot go below zero or concurrent modification occurred.');
        }
        const updatedItem = await tx.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
        const updatedQty = updatedItem.quantity;
        
        await tx.orm.public.RestaurantStockMovement.create({
        organizationId: item.organizationId,
        itemId,
        delta,
        note: note ?? (delta > 0 ? 'Restock' : 'Usage'),
        recordedById: membership.id,
      });
      return updatedQty;
    });

    safeRevalidatePath('/', 'layout');
    return { success: true, quantity: next, lowStock: next <= item.lowStockLevel };
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { error: error instanceof Error ? error.message : 'Failed to adjust stock.' };
  }
}

export async function getStockMovements(organizationId: string, itemId?: string) {
  try {
    await requireMembership(organizationId);
    const all = await db.orm.public.RestaurantStockMovement.where({ organizationId }).all();
    const filtered = itemId ? all.filter((m: any) => m.itemId === itemId) : all;
    const items = await db.orm.public.RestaurantInventoryItem.where({ organizationId }).all();
    const sorted = [...filtered].sort((a: any, b: any) =>
      new Date(b.createdAt.toString()).getTime() - new Date(a.createdAt.toString()).getTime());
    return JSON.parse(JSON.stringify(
      sorted.map((m: any) => ({ ...m, itemName: items.find((i) => i.id === m.itemId)?.name ?? 'Unknown' })),
    ));
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Financial Manager (all styles)
// ---------------------------------------------------------------------------

export async function addExpense(input: {
  organizationId: string;
  locationId?: string;
  category: string;
  amount: number;
  note?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'FINANCE']);
    if (!(input.amount > 0)) return { error: 'Expense amount must be greater than zero.' };

    const expense = await db.orm.public.RestaurantExpense.create({
      organizationId: input.organizationId,
      category: input.category.trim() || 'other',
      amount: input.amount,
      locationId: input.locationId ?? null,
      note: input.note ?? null,
    });
    safeRevalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(expense));
  } catch (error) {
    console.error('Error adding expense:', error);
    return { error: error instanceof Error ? error.message : 'Failed to add expense.' };
  }
}

export async function getExpenses(organizationId: string, locationId?: string) {
  try {
    await requireMembership(organizationId);
    let q = db.orm.public.RestaurantExpense.where({ organizationId });
    if (locationId) {
      q = q.where({ locationId });
    }
    const expenses = await q.all();
    const sorted = [...expenses].sort((a: any, b: any) =>
      new Date(b.spentAt.toString()).getTime() - new Date(a.spentAt.toString()).getTime());
    return JSON.parse(JSON.stringify(sorted));
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}

/**
 * Sales + expenses summary for the financial manager: today's revenue by
 * payment method, order count, average ticket, expense totals.
 */
export async function getFinancialSummary(organizationId: string, locationId?: string) {
  try {
    await requireMembership(organizationId);

    let oQ = db.orm.public.RestaurantOrder.where({ organizationId });
    if (locationId) oQ = oQ.where({ locationId });
    const orders = await oQ.all();
    let eQ = db.orm.public.RestaurantExpense.where({ organizationId });
    if (locationId) eQ = eQ.where({ locationId });
    const expenses = await eQ.all();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    // PHASE 1B DEBT: Revenue is derived from orders with status === 'COMPLETED'.
    // Until CityPay introduces a separate PaymentStatus, COMPLETED is the closest
    // proxy for "collected". Redesign financial reporting to use PaymentStatus once
    // Phase 1B payment infrastructure is in place.
    const paidOrders = orders.filter((o: any) => o.status === 'COMPLETED');
    const todaysOrders = paidOrders.filter((o: any) =>
      new Date(o.createdAt.toString()).getTime() >= startOfToday.getTime());
    const weeksOrders = paidOrders.filter((o: any) =>
      new Date(o.createdAt.toString()).getTime() >= startOfWeek.getTime());

    const revenueByMethod = { WALLET: 0, CASH: 0, POS: 0, TRANSFER: 0 };
    for (const o of todaysOrders) {
      const method = (o.paymentMethod ?? 'CASH') as keyof typeof revenueByMethod;
      if (method in revenueByMethod) revenueByMethod[method] += o.totalAmount;
    }

    const todaysExpenses = expenses.filter((e: any) =>
      new Date(e.spentAt.toString()).getTime() >= startOfToday.getTime());
    const weeksExpenses = expenses.filter((e: any) =>
      new Date(e.spentAt.toString()).getTime() >= startOfWeek.getTime());

    const todayRevenue = todaysOrders.reduce((s: number, o: any) => s + o.totalAmount, 0);
    const weekRevenue = weeksOrders.reduce((s: number, o: any) => s + o.totalAmount, 0);

    return JSON.parse(JSON.stringify({
      today: {
        revenue: todayRevenue,
        orders: todaysOrders.length,
        averageTicket: todaysOrders.length > 0 ? Math.round(todayRevenue / todaysOrders.length) : 0,
        revenueByMethod,
      },
      week: {
        revenue: weekRevenue,
        orders: weeksOrders.length,
        expenses: weeksExpenses.reduce((s: number, e: any) => s + e.amount, 0),
        net: weekRevenue - weeksExpenses.reduce((s: number, e: any) => s + e.amount, 0),
      },
      openTickets: orders.filter((o: any) =>
        ['PENDING', 'PREPARING', 'READY', 'DELIVERING'].includes(o.status)).length,
      expensesToday: todaysExpenses.reduce((s: number, e: any) => s + e.amount, 0),
    }));
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Registration (dedicated RestaurantOS onboarding)
// ---------------------------------------------------------------------------

/**
 * Register a restaurant / eatery / fast-food business: creates the
 * Organization (type RESTAURANT, validated city), the OWNER membership, and
 * provisions RestaurantSettings with the chosen operating style ΓÇö one atomic
 * onboarding, mirroring provisionShopOS.
 */
export async function registerRestaurantOS(input: {
  businessName: string;
  description?: string;
  serviceStyle: 'FULL_SERVICE' | 'COUNTER' | 'HYBRID';
  citySlug: string;
  area?: string;
  address?: string;
  phone?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return { error: 'You must be logged in to register a business.' };
    }
    const businessName = (input.businessName || '').trim();
    if (!businessName) return { error: 'Business name is required.' };

    // Prevent duplicate restaurant registration by the same owner
    const existingOrgs = await db.orm.public.Organization.where({ name: businessName }).all();
    if (existingOrgs.length > 0) {
      for (const existingOrg of existingOrgs) {
        const mem = await db.orm.public.Membership.where({ organizationId: existingOrg.id, personId: session.user.personId }).all().first();
        if (mem) {
          return { error: `You already own or belong to a restaurant named "${businessName}".` };
        }
      }
    }

    // Validate the city (state -> LGA selection) against the canonical registry.
    // Never persist an unvalidated client value.
    const city = await db.orm.public.City.where({ slug: (input.citySlug || '').trim().toLowerCase() }).all().first();
    if (!city || !city.isActive) {
      return { error: 'Unknown city. Pick a supported state and local government.' };
    }

    const orgId = await db.transaction(async (tx: any) => {
      const org = await tx.orm.public.Organization.create({
        name: businessName,
        type: 'RESTAURANT' as any,
        description: input.description ?? '',
        address: input.address ?? null,
      });

      const membership = await tx.orm.public.Membership.create({
        personId: session.user.personId,
        organizationId: org.id,
      });

      await tx.orm.public.MembershipRole.create({
        membershipId: membership.id,
        role: 'OWNER',
      });

      // Provision primary Location bound to canonical City
      const location = await tx.orm.public.Location.create({
        organizationId: org.id,
        name: input.area ? `${input.area} Branch` : 'Main Location',
        address: input.address ?? null,
        cityId: city.id,
      });

      // Bind membership to primary location
      await tx.orm.public.MembershipLocation.create({
        membershipId: membership.id,
        locationId: location.id,
      });

      // Provision canonical organization wallet
      await tx.orm.public.Wallet.create({
        organizationId: org.id,
        balance: 0.0,
        currency: city.currency || 'NGN',
      });

      await tx.orm.public.RestaurantSettings.create({
        organizationId: org.id,
        serviceStyle: input.serviceStyle,
      });

      // Provision canonical DiscoveryListing for marketplace discovery
      const listingSlug = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${org.id.slice(0, 8)}`;
      await tx.orm.public.DiscoveryListing.create({
        organizationId: org.id,
        locationId: location.id,
        cityId: city.id,
        vertical: 'RESTAURANT',
        slug: listingSlug,
        title: businessName,
        description: input.description ?? null,
        metadata: JSON.stringify({
          area: input.area || null,
        }),
        isActive: true,
      });

      return org.id;
    });

    return { success: true, organizationId: orgId };
  } catch (error) {
    console.error('Error registering RestaurantOS:', error);
    return { error: error instanceof Error ? error.message : 'Failed to register.' };
  }
}

/**
 * Portal data fetcher: everything the RestaurantOS workspace needs in one
 * call (settings, menu, tables, reservations, tickets, orders, inventory,
 * expenses). Gated by membership like every read here.
 */
export async function getRestaurantOSData(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const [settings, menu, tables, reservations, tickets, orders, inventory, expenses, recipes, productionRuns, shifts] =
      await Promise.all([
        getRestaurantOSSettings(organizationId),
        getMenuItems(organizationId),
        getTables(organizationId),
        getReservations(organizationId),
        getKitchenTickets(organizationId),
        getOrders(organizationId, { limit: 50 }),
        getInventoryItems(organizationId),
        getExpenses(organizationId),
        getRecipes(organizationId),
        getProductionRuns(organizationId),
        getRestaurantShifts(organizationId),
      ]);
    return JSON.parse(JSON.stringify({
      settings,
      menu,
      tables,
      reservations,
      tickets,
      orders,
      inventory,
      expenses,
      recipes,
      productionRuns,
    }));
  } catch (error) {
    console.error('Error fetching RestaurantOS data:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Suppliers (shared RetailSupplier table, scoped by organizationId)
// ---------------------------------------------------------------------------


export async function refundRestaurantOrder(orderId: string, input: { reason?: string }) {
  try {
    const o = await db.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
    if (!o) return { error: 'Order not found.' };
    const { membership } = await requireMembership(o.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], o.locationId);

    await db.transaction(async (tx: any) => {
      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      if (order.status === 'CANCELLED') throw new Error('Order is already cancelled.');

      const payment = await tx.orm.public.Payment.where({ restaurantOrderId: orderId }).all().first();
      if (!payment) throw new Error('No payment found for this order.');
      if (payment.status === 'REFUNDED') throw new Error('Payment is already fully refunded.');

      const existingRefunds = await tx.orm.public.Refund.where({ paymentId: payment.id }).all();
      const totalRefunded = existingRefunds.reduce((sum: number, r: any) => sum + r.amount, 0);
      const refundable = payment.amount - totalRefunded;

      if (refundable <= 0) throw new Error('Payment has no refundable amount remaining.');

      await tx.orm.public.Refund.create({
        organizationId: payment.organizationId,
        paymentId: payment.id,
        amount: refundable,
        currency: payment.currency,
        status: 'COMPLETED',
        reason: input.reason ?? `Restaurant order ${order.orderNumber} refunded`,
        processedById: membership.id,
      });

      await tx.orm.public.Payment.where({ id: payment.id }).update({ status: 'REFUNDED' });
      await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ status: 'CANCELLED' });

      // Note: Inventory is NOT automatically returned for food orders (food waste), 
      // fulfilling the requirement: Payment refund != Inventory return.
    });

    safeRevalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error refunding order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to refund order.' };
  }
}




// ---------------------------------------------------------------------------
// SHIFTS & CASH MANAGEMENT (PHASE B)
// ---------------------------------------------------------------------------

export async function openShift(input: { organizationId: string; locationId?: string; openingFloat: number }) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], input.locationId);
    if (input.openingFloat < 0) {
      return { error: 'Opening float cannot be negative.' };
    }
    
    return await db.transaction(async (tx: any) => {
      // Check for existing open shift at this location or org-wide
      const existing = await tx.orm.public.RestaurantShift.where({
        organizationId: input.organizationId,
        ...(input.locationId ? { locationId: input.locationId } : {}),
        status: 'OPEN',
      }).all();
      
      if (existing.length > 0) {
        return { success: true, shift: JSON.parse(JSON.stringify(existing[0])), alreadyOpen: true };
      }

      const shift = await tx.orm.public.RestaurantShift.create({
        organizationId: input.organizationId,
        locationId: input.locationId ?? null,
        openedById: membership.id,
        openingFloat: input.openingFloat,
        status: 'OPEN',
      });
      return { success: true, shift };
    });
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function closeShift(input: { shiftId: string; actualCash: number; notes?: string }) {
  try {
    if (input.actualCash < 0) {
      return { error: 'Actual cash count cannot be negative.' };
    }
    return await db.transaction(async (tx: any) => {
      const shift = await tx.orm.public.RestaurantShift.where({ id: input.shiftId }).all().first();
      if (!shift) throw new Error('Shift not found.');
      const { membership } = await requireMembership(shift.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], shift.locationId);

      if (shift.status === 'CLOSED') throw new Error('Shift is already closed.');

      // Calculate authoritative expected cash
      // expected = openingFloat + (sum of CASH payments) - (sum of CASH refunds)
      const allOrders = await tx.orm.public.RestaurantOrder.where({ shiftId: shift.id, paymentMethod: 'CASH' }).all();
        const cashSales = allOrders.filter((o:any) => ['PAID', 'COMPLETED'].includes(o.paymentStatus)).reduce((sum:number, o:any) => sum + o.totalAmount, 0);
        const refunds = allOrders.filter((o:any) => o.paymentStatus === 'REFUNDED').reduce((sum:number, o:any) => sum + o.totalAmount, 0);
      
      const expectedCash = shift.openingFloat + cashSales - refunds;
      const variance = input.actualCash - expectedCash;

      const closed = await tx.orm.public.RestaurantShift.where({ id: input.shiftId }).update({
        status: 'CLOSED',
        closedById: membership.id,
        closedAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()),
        expectedCash,
        actualCash: input.actualCash,
        variance,
        notes: input.notes || null
      });

      return { success: true, shift: closed };
    });
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getActiveShift(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId, undefined, locationId ?? undefined);
    let shift: any = null;
    if (locationId) {
      shift = await db.orm.public.RestaurantShift.where({
        organizationId,
        locationId,
        status: 'OPEN'
      }).all().first();
    }
    if (!shift) {
      shift = await db.orm.public.RestaurantShift.where({
        organizationId,
        locationId: null,
        status: 'OPEN'
      }).all().first();
    }
    if (!shift) {
      shift = await db.orm.public.RestaurantShift.where({
        organizationId,
        status: 'OPEN'
      }).all().first();
    }
    return { shift: shift ? JSON.parse(JSON.stringify(shift)) : null };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ---------------------------------------------------------------------------
// WASTE MANAGEMENT (PHASE B)
// ---------------------------------------------------------------------------

export async function recordWaste(input: {
  organizationId: string;
  locationId: string;
  itemId: string;
  quantity: number;
  reason: string;
  notes?: string;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN', 'INVENTORY_STAFF'], input.locationId);
    
    if (input.quantity <= 0) return { error: 'Waste quantity must be greater than zero.' };

    return await db.transaction(async (tx: any) => {
      const lockedCount = await tx.execute(db.raw.sql`SELECT id FROM "restaurantInventoryItem" WHERE id = ${input.itemId} FOR UPDATE`.affectedCount().build());
      if (lockedCount === 0) throw new Error('Item not found.');

      const item = await tx.orm.public.RestaurantInventoryItem.where({ id: input.itemId }).all().first();
      if (item.locationId && item.locationId !== input.locationId) {
        throw new Error('Item belongs to a different location.');
      }
      
      // We allow negative stock per existing policy (if it was allowed), but usually waste is from positive stock.
      await tx.execute(db.raw.sql`
        UPDATE "restaurantInventoryItem"
        SET "quantity" = "quantity" - ${input.quantity}
        WHERE id = ${input.itemId}
      `.affectedCount().build());

      const movement = await tx.orm.public.RestaurantStockMovement.create({
        organizationId: input.organizationId,
        itemId: input.itemId,
        type: 'WASTE',
        delta: -input.quantity,
        unitCost: item.cost,
        note: `${input.reason}: ${input.notes || ''}`,
        recordedById: membership.id
      });

      return { success: true, movement };
    });
  } catch (error: any) {
    return { error: error.message };
  }
}


export async function getRestaurantShifts(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const shifts = await db.orm.public.RestaurantShift.where({ organizationId }).orderBy((s) => s.createdAt.desc()).all();
    return JSON.parse(JSON.stringify(shifts));
  } catch(e) {
    return [];
  }
}


export async function updateOrderItemStatus(
  orderId: string,
  itemId: string,
  kitchenStatus: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED'
) {
  try {
    const res = await db.transaction(async (tx: any) => {
      const lockedCount = await tx.execute(db.raw.sql`SELECT id FROM "restaurantOrder" WHERE id = ${orderId} FOR UPDATE`.affectedCount().build());
      if (lockedCount === 0) throw new Error('Order not found.');

      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'], order.locationId);

      const item = await tx.orm.public.OrderItem.where({ id: itemId }).all().first();
      if (!item) throw new Error('Item not found.');

      await tx.orm.public.OrderItem.where({ id: itemId }).update({ kitchenStatus });

      // If all items are READY or COMPLETED, mark order as READY
      const allItems = await tx.orm.public.OrderItem.where({ orderId }).all();
      const allReady = allItems.every((i: any) => 
        i.id === itemId ? ['READY', 'COMPLETED'].includes(kitchenStatus) : ['READY', 'COMPLETED'].includes(i.kitchenStatus)
      );

      if (allReady && !['READY', 'COMPLETED', 'DELIVERING'].includes(order.status)) {
        await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ 
          status: 'READY',
          kitchenCompletedAt: order.kitchenCompletedAt || toInstant()
        });
      }
      
      // If any item is PREPARING, mark order as PREPARING and ensure kitchenStartedAt is set
      if (kitchenStatus === 'PREPARING' && !order.kitchenStartedAt) {
        await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ 
          status: 'PREPARING',
          kitchenStartedAt: toInstant()
        });
      }

      return { success: true };
    });
    
    // Fire event/revalidate outside tx
    safeRevalidatePath('/', 'layout');
    return res;
  } catch (error) {
    console.error('Error updating order item status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update item status.' };
  }
}

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

export async function deleteModifierGroup(groupId: string) {
  try {
    const group = await db.orm.public.ModifierGroup.where({ id: groupId }).all().first();
    if (!group) return { error: 'Modifier group not found.' };
    await requireMembership(group.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

    await db.orm.public.ModifierGroup.where({ id: groupId }).delete();

    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath(`/workspaces/restaurantos/${group.organizationId}/management/modifiers`);
      revalidatePath(`/workspaces/restaurantos/${group.organizationId}/pos`);
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting modifier group:', error);
    return { error: error?.message || 'Failed to delete modifier group.' };
  }
}

export async function deleteModifierOption(optionId: string) {
  try {
    const option = await db.orm.public.ModifierOption.where({ id: optionId }).all().first();
    if (!option) return { error: 'Modifier option not found.' };
    const group = await db.orm.public.ModifierGroup.where({ id: option.modifierGroupId }).all().first();
    if (!group) return { error: 'Group not found.' };
    await requireMembership(group.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

    await db.orm.public.ModifierOption.where({ id: optionId }).delete();

    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath(`/workspaces/restaurantos/${group.organizationId}/management/modifiers`);
      revalidatePath(`/workspaces/restaurantos/${group.organizationId}/pos`);
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting modifier option:', error);
    return { error: error?.message || 'Failed to delete modifier option.' };
  }
}

export async function createVariant(input: {
  organizationId: string;
  menuItemId: string;
  name: string;
  price: number;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

    // Ensure enableVariants capability exists and is active
    const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();
    if (!settings) {
      await db.orm.public.RestaurantSettings.create({
        organizationId: input.organizationId,
        enableVariants: true,
      });
    } else if (!settings.enableVariants) {
      await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).update({
        enableVariants: true,
      });
    }

    const trimmed = input.name ? String(input.name).trim() : '';
    if (!trimmed) {
      return { error: 'Variant name is required.' };
    }

    const priceNum = typeof input.price === 'string' ? parseFloat(input.price) : Number(input.price);
    if (isNaN(priceNum) || priceNum < 0) {
      return { error: 'Price must be 0 or greater.' };
    }

    const menuItem = await db.orm.public.MenuItem.where({ id: input.menuItemId }).all().first();
    if (!menuItem || menuItem.organizationId !== input.organizationId) {
      return { error: 'Menu item not found in this organization.' };
    }

    const variant = await db.orm.public.MenuItemVariant.create({
      organizationId: input.organizationId,
      menuItemId: input.menuItemId,
      name: trimmed,
      price: priceNum,
      isAvailable: true,
    });

    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath(`/workspaces/restaurantos/${input.organizationId}/management/variants`);
      revalidatePath(`/workspaces/restaurantos/${input.organizationId}/management/menu`);
      revalidatePath(`/workspaces/restaurantos/${input.organizationId}/pos`);
      revalidatePath('/food');
    } catch {}

    return { success: true, variant: JSON.parse(JSON.stringify(variant)) };
  } catch (error: any) {
    console.error('Error creating variant:', error);
    return { error: error?.message || 'Failed to create variant.' };
  }
}

export async function updateVariant(variantId: string, input: Partial<{ name: string; price: number; isAvailable: boolean }>) {
  try {
    const variant = await db.orm.public.MenuItemVariant.where({ id: variantId }).all().first();
    if (!variant) return { error: 'Variant not found.' };
    await requireMembership(variant.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

    const updateData: any = {};
    if (input.name !== undefined) {
      const trimmed = String(input.name).trim();
      if (!trimmed) return { error: 'Variant name cannot be empty.' };
      updateData.name = trimmed;
    }
    if (input.price !== undefined) {
      const priceNum = typeof input.price === 'string' ? parseFloat(String(input.price)) : Number(input.price);
      if (isNaN(priceNum) || priceNum < 0) return { error: 'Price must be 0 or greater.' };
      updateData.price = priceNum;
    }
    if (input.isAvailable !== undefined) {
      updateData.isAvailable = Boolean(input.isAvailable);
    }

    await db.orm.public.MenuItemVariant.where({ id: variantId }).update(updateData);

    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/management/variants`);
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/management/menu`);
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/pos`);
      revalidatePath('/food');
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error updating variant:', error);
    return { error: error?.message || 'Failed to update variant.' };
  }
}

export async function deleteVariant(variantId: string) {
  try {
    const variant = await db.orm.public.MenuItemVariant.where({ id: variantId }).all().first();
    if (!variant) return { error: 'Variant not found.' };
    await requireMembership(variant.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

    await db.orm.public.MenuItemVariant.where({ id: variantId }).delete();

    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/management/variants`);
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/management/menu`);
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/pos`);
      revalidatePath('/food');
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting variant:', error);
    return { error: error?.message || 'Failed to delete variant.' };
  }
}

export async function toggleVariantAvailability(variantId: string) {
  try {
    const variant = await db.orm.public.MenuItemVariant.where({ id: variantId }).all().first();
    if (!variant) return { error: 'Variant not found.' };
    await requireMembership(variant.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);

    const newStatus = !variant.isAvailable;
    await db.orm.public.MenuItemVariant.where({ id: variantId }).update({
      isAvailable: newStatus,
    });

    try {
      safeRevalidatePath('/', 'layout');
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/management/variants`);
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/management/menu`);
      revalidatePath(`/workspaces/restaurantos/${variant.organizationId}/pos`);
      revalidatePath('/food');
    } catch {}

    return { success: true, isAvailable: newStatus };
  } catch (error: any) {
    console.error('Error toggling variant availability:', error);
    return { error: error?.message || 'Failed to toggle availability.' };
  }
}
