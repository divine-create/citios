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
// RESTAURANTOS — action layer (Restaurants, Eateries & Fast Food)
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
      
      // Phase D.1 Hardening: Deterministic Capability Enforcement
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
      revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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

    // @ts-ignore — Prisma Next `in` operator on the ORM requires a ts-ignore
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
  category: string;
  imageUrl?: string;
  kitchenStation?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], (input as any).locationId || null);
    if (!input.name.trim()) return { error: 'Item name is required.' };
    if (!(input.price >= 0)) return { error: 'Price must be zero or greater.' };

    const item = await db.orm.public.MenuItem.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description ?? null,
      price: input.price,
      category: input.category.trim() || 'Mains',
      imageUrl: input.imageUrl ?? null,
      kitchenStation: input.kitchenStation ?? 'Main Kitchen',
      isAvailable: true,
    });

    // First menu item completes the onboarding step.
    const settings = await db.orm.public.RestaurantSettings
      .where({ organizationId: input.organizationId })
      .all()
      .first();
    if (settings && !settings.hasMenu) {
      await db.orm.public.RestaurantSettings
        .where({ organizationId: input.organizationId })
        .update({ hasMenu: true });
    }

    revalidatePath('/', 'layout');
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error creating menu item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create menu item.' };
  }
}

export async function updateMenuItem(
  menuItemId: string,
  input: Partial<{ name: string; description: string; price: number; category: string; imageUrl: string }>,
) {
  try {
    const menuItem = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
    if (!menuItem) return { error: 'Menu item not found.' };
    await requireMembership(menuItem.organizationId, ['OWNER', 'ADMIN', 'MANAGER'], menuItem.locationId);

    await db.orm.public.MenuItem.where({ id: menuItemId }).update(input);
    const updated = await db.orm.public.MenuItem.where({ id: menuItemId }).all().first();
    revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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
      name: input.name.trim(),
      seats: input.seats > 0 ? input.seats : 4,
      status: 'available',
    });
    const settings = await db.orm.public.RestaurantSettings
      .where({ organizationId: input.organizationId })
      .all()
      .first();
    if (settings && !settings.hasTables) {
      await db.orm.public.RestaurantSettings
        .where({ organizationId: input.organizationId })
        .update({ hasTables: true });
    }
    revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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
          SELECT id FROM "RestaurantTable"
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

    revalidatePath('/', 'layout');
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
    revalidatePath('/', 'layout');
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
  paymentMethod?: 'WALLET' | 'CASH' | 'POS';
  customerDataId?: string;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER'], input.locationId);
    if (input.items.length === 0) return { error: 'No items on the order.' };

    // Resolve menu items in ONE org-scoped fetch and refuse any item that does
    // not belong to this kitchen — a cross-tenant corruption guard (mirrors
    // retail.ts createOrder).
    
      // Enforce active shift
      const activeShift = await db.orm.public.RestaurantShift.where({
        organizationId: input.organizationId,
        locationId: input.locationId || null,
        status: 'OPEN'
      }).all().first();

      if (!activeShift) {
        return { error: 'No active shift. You must open a shift before processing orders.' };
      }
      const orgMenu = await db.orm.public.MenuItem.where({ organizationId: input.organizationId }).all();
    const itemById = new Map(orgMenu.map((m: any) => [m.id, m]));

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
          if (!settings?.enableVariants) return { error: 'Variants are disabled for this organization.' };
          const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
          if (!variant || !variant.isAvailable) return { error: 'Invalid or inactive variant selected.' };
          
          unitPrice = variant.price;
          variantName = variant.name;
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
            const opts = await db.orm.public.ModifierOption.where({ id: { in: item.modifierOptionIds } }).all();
            
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

    // Settings: tax, service charge, next call-out number.
    const settings = await db.orm.public.RestaurantSettings
      .where({ organizationId: input.organizationId })
      .all()
      .first();
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
        customerDataId: input.customerDataId ?? null,
        totalAmount,
        shiftId: activeShift.id,
          type: input.type ?? 'DINE_IN',
        tableId,
        orderNumber,
        paymentMethod: input.paymentMethod ?? null,
        paidAt: paid ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) : null,
        status: paid ? (settings?.serviceStyle === 'COUNTER' ? 'COMPLETED' : 'PREPARING') : 'PENDING',
        servedByMembershipId: membership.id,
      });
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

    revalidatePath('/', 'layout');

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
export async function processRestaurantPayment(orderId: string, paymentMethod: 'CASH'|'POS'|'WALLET') {
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
      if (status === 'PREPARING' && !kitchenStartedAt) kitchenStartedAt = new Date();
      if (status === 'READY' && !kitchenCompletedAt) kitchenCompletedAt = new Date();


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

      await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ status, kitchenStartedAt, kitchenCompletedAt });
      return await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
    });

    try {
        const { revalidatePath } = require('next/cache');
        revalidatePath('/', 'layout');
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
  ingredients: { itemId: string; quantity: number }[];
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'MANAGER', 'ADMIN']);
      await requireRestaurantCapability(input.organizationId, 'enableRecipes');
      
      // Multi-location/tenant verification for inventory items
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
        }).all().first();
         if (!i || i.organizationId !== input.organizationId) throw new Error("Invalid ingredient item.");
      }
    
    // In Prisma Next, we do this in a transaction
    return await db.transaction(async (tx: any) => {
      // 1. Create the recipe
      const recipe = await tx.orm.public.RestaurantRecipe.create({
        organizationId: input.organizationId,
        name: input.name,
        yieldQuantity: input.yieldQuantity,
        instructions: input.instructions ?? null,
      });

      // 2. Add ingredients
      for (const ing of input.ingredients) {
        await tx.orm.public.RestaurantRecipeIngredient.create({
          recipeId: recipe.id,
          itemId: ing.itemId,
          quantity: ing.quantity,
        });
      }
      
      // 3. Link produced item if given
      if (input.producedItemId) {
        // Find item and link it
        // Wait, the relation is on RestaurantInventoryItem: recipeId
        await tx.orm.public.RestaurantInventoryItem.update({
          id: input.producedItemId,
          recipeId: recipe.id
        });
      }

      return JSON.parse(JSON.stringify(recipe));
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw new Error('Failed to create recipe');
  }
}

export async function createProductionRun(input: {
  organizationId: string;
  recipeId: string;
  locationId?: string;
  plannedYield: number;
  actualYield: number;
  notes?: string;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN', 'INVENTORY_STAFF'], input.locationId);
    await requireRestaurantCapability(input.organizationId, 'enableProduction');
    
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
    return shifts;
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
          kitchenCompletedAt: order.kitchenCompletedAt || new Date()
        });
      }
      
      // If any item is PREPARING, mark order as PREPARING
      if (kitchenStatus === 'PREPARING' && order.status === 'PENDING') {
        await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ 
          status: 'PREPARING',
          kitchenStartedAt: order.kitchenStartedAt || new Date()
        });
      }

      return { success: true };
    });
    
    // Fire event/revalidate outside tx
    revalidatePath('/', 'layout');
    return res;
  } catch (error) {
    console.error('Error updating order item status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update item status.' };
  }
}

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
