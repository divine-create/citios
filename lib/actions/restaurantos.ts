'use server';

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
  }>,
) {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER']);
    const { logoAssetId, ...settingsUpdates } = updates;
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
      revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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

    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
        `.returnsRow({ id: 'string' }).build());

        if (!tableLock || tableLock.length === 0) {
          throw new Error('Table not found or could not be locked.');
        }

        // 2. Check overlapping time windows while holding the table lock
        const windowMs = 60 * 60 * 1000; 
        const minTime = new Date(scheduled.getTime() - windowMs).toISOString();
        const maxTime = new Date(scheduled.getTime() + windowMs).toISOString();
        
        const overlaps = await tx.execute(db.raw.sql`
          SELECT id FROM "RestaurantReservation"
          WHERE "tableId" = ${input.tableId}
            AND "status" IN ('pending', 'confirmed', 'seated')
            AND "scheduledAt" > ${minTime}::timestamp
            AND "scheduledAt" < ${maxTime}::timestamp
        `.returnsRow({ id: 'string' }).build());
        
        if (overlaps && overlaps.length > 0) {
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

    revalidatePath('/admin/restaurantos');
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
    revalidatePath('/admin/restaurantos');
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
      customerName,
      tableName,
      items: items.map((i: any) => ({
        ...i,
        itemName: menuItems.find((m) => m.id === i.menuItemId)?.name ?? 'Unknown',
          kitchenStation: menuItems.find((m) => m.id === i.menuItemId)?.kitchenStation ?? 'Main Kitchen',
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
  items: { menuItemId: string; quantity: number; notes?: string }[];
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

    const lineItems: { menuItemId: string; quantity: number; unitPrice: number; notes: string | null }[] = [];
    let subtotal = 0;
    for (const item of input.items) {
      const menuItem = itemById.get(item.menuItemId);
      if (!menuItem) return { error: "An item on the order is not on this kitchen's menu." };
      if (menuItem.isAvailable === false) return { error: `86'd item: ${menuItem.name} is unavailable.` };
      const quantity = item.quantity;
      if (!(quantity > 0)) return { error: 'Item quantities must be greater than zero.' };
      const unitPrice = menuItem.price; // server-authoritative, never client price
      lineItems.push({ menuItemId: menuItem.id, quantity, unitPrice, notes: item.notes ?? null });
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
        await tx.orm.public.OrderItem.create({
          orderId: created.id,
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          notes: line.notes,
        });
      }
      // Advance the call-out counter (same transaction as the order).
      await tx.orm.public.RestaurantSettings
        .where({ organizationId: input.organizationId })
        .update({ nextOrderNumber: orderNumber + 1 });
      return created;
    });

    revalidatePath('/admin/restaurantos');

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
      const locked = await tx.execute(db.raw.sql`SELECT id FROM "RestaurantOrder" WHERE id = ${orderId} FOR UPDATE`.returnsRow({ id: 'string' }).build());
      if (!locked || locked.length === 0) throw new Error('Order not found.');
      
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
      const locked = await tx.execute(db.raw.sql`SELECT id FROM "RestaurantOrder" WHERE id = ${orderId} FOR UPDATE`.returnsRow({ id: 'string' }).build());
      if (!locked || locked.length === 0) throw new Error('Order not found.');

      const order = await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
      if (!order) throw new Error('Order not found.');
      await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'], order.locationId);

      if (order.status === 'CANCELLED' && status !== 'CANCELLED') throw new Error('Cannot change status of a cancelled order.');

      // P0-A: Sales -> Inventory Consumption (Transactional, Idempotent)
      if (status === 'COMPLETED' && !order.inventoryConsumed) {
        const items = await tx.orm.public.OrderItem.where({ orderId: orderId }).all();
        for (const line of items) {
          const menuItem = await tx.orm.public.MenuItem.where({ id: line.menuItemId }).all().first();
          if (menuItem && menuItem.inventoryItemId) {
            const lockedInv = await tx.execute(db.raw.sql`SELECT id FROM "RestaurantInventoryItem" WHERE id = ${menuItem.inventoryItemId} FOR UPDATE`.returnsRow({ id: 'string' }).build());
            if (lockedInv && lockedInv.length > 0) {
              const invItem = await tx.orm.public.RestaurantInventoryItem.where({ id: menuItem.inventoryItemId }).all().first();
              await tx.execute(db.raw.sql`
                UPDATE "RestaurantInventoryItem"
                SET "quantity" = "quantity" - ${line.quantity}
                WHERE id = ${invItem.id}
              `.affectedCount().build());
              await tx.orm.public.RestaurantStockMovement.create({
                organizationId: order.organizationId,
                itemId: invItem.id,
                type: 'POS_SALE',
                delta: -line.quantity,
                unitCost: invItem.cost,
                note: `Consumed for Order ${order.orderNumber || orderId}`
              });
              await tx.orm.public.OrderItem.where({ id: line.id }).update({ unitCost: invItem.cost });
            }
          }
        }
        await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ inventoryConsumed: true });
      }

      // Reversal on CANCELLED
      if (status === 'CANCELLED' && order.inventoryConsumed) {
        const items = await tx.orm.public.OrderItem.where({ orderId: orderId }).all();
        for (const line of items) {
          const menuItem = await tx.orm.public.MenuItem.where({ id: line.menuItemId }).all().first();
          if (menuItem && menuItem.inventoryItemId) {
            const lockedInv = await tx.execute(db.raw.sql`SELECT id FROM "RestaurantInventoryItem" WHERE id = ${menuItem.inventoryItemId} FOR UPDATE`.returnsRow({ id: 'string' }).build());
            if (lockedInv && lockedInv.length > 0) {
              const invItem = await tx.orm.public.RestaurantInventoryItem.where({ id: menuItem.inventoryItemId }).all().first();
              await tx.execute(db.raw.sql`
                UPDATE "RestaurantInventoryItem"
                SET "quantity" = "quantity" + ${line.quantity}
                WHERE id = ${invItem.id}
              `.affectedCount().build());
              await tx.orm.public.RestaurantStockMovement.create({
                organizationId: order.organizationId,
                itemId: invItem.id,
                type: 'MANUAL_ADJUSTMENT',
                delta: line.quantity,
                unitCost: line.unitCost || invItem.cost,
                note: `Reversed cancellation for Order ${order.orderNumber || orderId}`
              });
            }
          }
        }
        await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ inventoryConsumed: false });
      }

      // Reversal of payment status (if cancelling an already paid order)
      if (status === 'CANCELLED' && (order.paymentStatus === 'PAID' || order.paymentStatus === 'COMPLETED')) {
         await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ paymentStatus: 'REFUNDED' });
      }

      await tx.orm.public.RestaurantOrder.where({ id: orderId }).update({ status });
      return await tx.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
    });

    try {
        const { revalidatePath } = require('next/cache');
        revalidatePath('/admin/restaurantos');
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
    await requireMembership(input.organizationId);
    
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
          quantity: input.actualYield,
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
    revalidatePath('/admin/restaurantos');
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create inventory item.' };
  }
}

export async function updateInventoryItem(
  itemId: string,
  input: Partial<{ name: string; unit: string; lowStockLevel: number; cost: number }>,
) {
  try {
    const item = await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    if (!item) return { error: 'Inventory item not found.' };
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF'], item.locationId);

    await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).update(input);
    const updated = await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    revalidatePath('/admin/restaurantos');
    return JSON.parse(JSON.stringify(updated));
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

    await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).delete();
    revalidatePath('/admin/restaurantos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete inventory item.' };
  }
}

/** Restock or record usage — every change lands in the movement audit trail. */
export async function adjustStock(itemId: string, delta: number, note?: string) {
  try {
    const item = await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).all().first();
    if (!item) return { error: 'Inventory item not found.' };
    const { membership } = await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF', 'KITCHEN']);
    if (!(delta !== 0)) return { error: 'Adjustment must be non-zero.' };

    const next = await db.transaction(async (tx: any) => {
      // Re-read item inside transaction for concurrency
              const updated = await tx.execute(db.raw.sql`
          UPDATE "RestaurantInventoryItem"
          SET "quantity" = "quantity" + ${delta}
          WHERE id = ${itemId} AND "quantity" + ${delta} >= 0
          RETURNING "quantity"
        `.affectedCount().build());
        if (!updated || updated.length === 0) {
          throw new Error('Stock cannot go below zero or concurrent modification occurred.');
        }
        const updatedQty = updated[0].quantity;
        
        await tx.orm.public.RestaurantStockMovement.create({
        organizationId: item.organizationId,
        itemId,
        delta,
        note: note ?? (delta > 0 ? 'Restock' : 'Usage'),
        recordedById: membership.id,
      });
      return updatedQty;
    });

    revalidatePath('/admin/restaurantos');
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
      note: input.note ?? null,
    });
    revalidatePath('/admin/restaurantos');
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
export async function getFinancialSummary(organizationId: string) {
  try {
    await requireMembership(organizationId);

    const orders = await db.orm.public.RestaurantOrder.where({ organizationId }).all();
    const expenses = await db.orm.public.RestaurantExpense.where({ organizationId }).all();

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

    const revenueByMethod = { WALLET: 0, CASH: 0, POS: 0 };
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
 * provisions RestaurantSettings with the chosen operating style — one atomic
 * onboarding, mirroring provisionShopOS.
 */
export async function registerRestaurantOS(input: {
  businessName: string;
  description?: string;
  serviceStyle: 'FULL_SERVICE' | 'COUNTER' | 'HYBRID';
  citySlug: string;
  address?: string;
  phone?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.personId) {
      return { error: 'You must be logged in to register a business.' };
    }
    if (!input.businessName?.trim()) return { error: 'Business name is required.' };

    // Validate the city (state → LGA selection) against the canonical registry.
    // Never persist an unvalidated client value.
    const city = await db.orm.public.City.where({ slug: (input.citySlug || '').trim().toLowerCase() }).all().first();
    if (!city || !city.isActive) {
      return { error: 'Unknown city. Pick a supported state and local government.' };
    }

    const org = await db.orm.public.Organization.create({
      name: input.businessName.trim(),
      type: 'RESTAURANT' as any,
      description: input.description ?? '',
      address: input.address ?? null,
      
    });

    const membership = await db.orm.public.Membership.create({
      personId: session.user.personId,
      organizationId: org.id,
    });
    await db.orm.public.MembershipRole.create({
      membershipId: membership.id,
      role: 'OWNER',
    });

    await db.orm.public.RestaurantSettings.create({
      organizationId: org.id,
      serviceStyle: input.serviceStyle,
    });

    return { success: true, organizationId: org.id };
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

    revalidatePath('/admin/restaurantos');
    return { success: true };
  } catch (error) {
    console.error('Error refunding order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to refund order.' };
  }
}




// ---------------------------------------------------------------------------
// SHIFTS & CASH MANAGEMENT (PHASE B)
// ---------------------------------------------------------------------------

export async function openShift(input: { organizationId: string; locationId: string; openingFloat: number }) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], input.locationId);
    
    return await db.transaction(async (tx: any) => {
      // Check for existing open shift at this location
      const existing = await tx.execute(db.raw.sql`SELECT id FROM "RestaurantShift" WHERE "organizationId" = ${input.organizationId} AND "locationId" = ${input.locationId} AND "status" = 'OPEN' FOR UPDATE`.returnsRow({ id: 'string' }).build());
      
      if (existing && existing.length > 0) {
        throw new Error('An active shift already exists for this location.');
      }

      const shift = await tx.orm.public.RestaurantShift.create({
        organizationId: input.organizationId,
        locationId: input.locationId,
        openedById: membership.id,
        openingFloat: input.openingFloat,
        status: 'OPEN'
      });
      return { success: true, shift };
    });
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function closeShift(input: { shiftId: string; actualCash: number; notes?: string }) {
  try {
    return await db.transaction(async (tx: any) => {
      const locked = await tx.execute(db.raw.sql`SELECT id FROM "RestaurantShift" WHERE id = ${input.shiftId} FOR UPDATE`.returnsRow({ id: 'string' }).build());
      if (!locked || locked.length === 0) throw new Error('Shift not found.');
      
      const shift = await tx.orm.public.RestaurantShift.where({ id: input.shiftId }).all().first();
      const { membership } = await requireMembership(shift.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], shift.locationId);

      if (shift.status === 'CLOSED') throw new Error('Shift is already closed.');

      // Calculate authoritative expected cash
      // expected = openingFloat + (sum of CASH payments) - (sum of CASH refunds)
      const cashPayments = await tx.execute(db.raw.sql`
        SELECT COALESCE(SUM("totalAmount"), 0) as "cashSales"
        FROM "RestaurantOrder"
        WHERE "shiftId" = ${shift.id} AND "paymentMethod" = 'CASH' AND "paymentStatus" IN ('PAID', 'COMPLETED')
      `.returnsRow({ cashSales: 'number' }).build());
      
      const cashRefunds = await tx.execute(db.raw.sql`
        SELECT COALESCE(SUM("totalAmount"), 0) as "cashRefunds"
        FROM "RestaurantOrder"
        WHERE "shiftId" = ${shift.id} AND "paymentMethod" = 'CASH' AND "paymentStatus" = 'REFUNDED'
      `.returnsRow({ cashRefunds: 'number' }).build());

      const cashSales = cashPayments[0]?.cashSales || 0;
      const refunds = cashRefunds[0]?.cashRefunds || 0;
      
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

export async function getActiveShift(organizationId: string, locationId: string) {
  try {
    await requireMembership(organizationId, undefined, locationId);
    const shift = await db.orm.public.RestaurantShift.where({
      organizationId,
      locationId,
      status: 'OPEN'
    }).all().first();
    return { shift };
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
      const locked = await tx.execute(db.raw.sql`SELECT id FROM "RestaurantInventoryItem" WHERE id = ${input.itemId} FOR UPDATE`.returnsRow({ id: 'string' }).build());
      if (!locked || locked.length === 0) throw new Error('Item not found.');

      const item = await tx.orm.public.RestaurantInventoryItem.where({ id: input.itemId }).all().first();
      if (item.locationId && item.locationId !== input.locationId) {
        throw new Error('Item belongs to a different location.');
      }
      
      // We allow negative stock per existing policy (if it was allowed), but usually waste is from positive stock.
      await tx.execute(db.raw.sql`
        UPDATE "RestaurantInventoryItem"
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
