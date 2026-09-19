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
import { db } from '@/src/prisma/db';
import { requireMembership } from '@/lib/actions/tenant';

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
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching RestaurantOS settings:', error);
    return null;
  }
}

/** Provision the OS for a new restaurant/eatery/fast-food org (idempotent). */
export async function provisionRestaurantOS(organizationId: string, serviceStyle = 'HYBRID') {
  try {
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
  }>,
) {
  try {
    await requireMembership(organizationId, ['OWNER', 'MANAGER']);
    const settings = await db.orm.public.RestaurantSettings
      .where({ organizationId })
      .all()
      .first();
    if (!settings) {
      const created = await db.orm.public.RestaurantSettings.create({
        organizationId,
        ...updates,
      });
      revalidatePath('/admin/restaurantos');
      return JSON.parse(JSON.stringify(created));
    }
    await db.orm.public.RestaurantSettings.where({ organizationId }).update(updates);
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

export async function getMenuItems(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const items = await db.orm.public.MenuItem.where({ organizationId }).all();
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
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Item name is required.' };
    if (!(input.price >= 0)) return { error: 'Price must be zero or greater.' };

    const item = await db.orm.public.MenuItem.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description ?? null,
      price: input.price,
      category: input.category.trim() || 'Mains',
      imageUrl: input.imageUrl ?? null,
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
    await requireMembership(menuItem.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

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
    await requireMembership(menuItem.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN']);

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
    await requireMembership(menuItem.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

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
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Addon name is required.' };
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
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Variant name is required.' };
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
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!input.name.trim()) return { error: 'Combo name is required.' };
    if (!(input.price >= 0)) return { error: 'Combo price must be zero or greater.' };
    if (input.items.length === 0) return { error: 'A combo needs at least one item.' };

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

export async function getTables(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const tables = await db.orm.public.RestaurantTable.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(tables));
  } catch (error) {
    console.error('Error fetching tables:', error);
    return [];
  }
}

export async function createTable(input: { organizationId: string; name: string; seats: number }) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
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
    await requireMembership(table.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'WAITER']);
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

export async function getReservations(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const reservations = await db.orm.public.RestaurantReservation.where({ organizationId }).all();
    return JSON.parse(JSON.stringify(reservations));
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return [];
  }
}

export async function createReservation(input: {
  organizationId: string;
  tableId?: string;
  customerDataId?: string;
  customerName?: string;
  customerPhone?: string;
  partySize: number;
  scheduledAt: string;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'WAITER']);
    if (!(input.partySize > 0)) return { error: 'Party size must be at least 1.' };
    const scheduled = new Date(input.scheduledAt);
    if (isNaN(scheduled.getTime())) return { error: 'Invalid reservation date.' };

    const reservation = await db.orm.public.RestaurantReservation.create({
      organizationId: input.organizationId,
      tableId: input.tableId ?? null,
      customerDataId: input.customerDataId ?? null,
      customerName: input.customerName ?? null,
      customerPhone: input.customerPhone ?? null,
      partySize: input.partySize,
      scheduledAt: scheduled,
      status: 'pending',
      notes: input.notes ?? null,
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
    await requireMembership(reservation.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'WAITER']);

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
      })),
    };
  }));
}

export async function getOrders(organizationId: string, options?: { status?: string; limit?: number }) {
  try {
    await requireMembership(organizationId);
    const all = await db.orm.public.RestaurantOrder.where({ organizationId }).all();
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
export async function getKitchenTickets(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const all = await db.orm.public.RestaurantOrder.where({ organizationId }).all();
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
  tableId?: string;
  paymentMethod?: 'WALLET' | 'CASH' | 'POS';
  customerDataId?: string;
}) {
  try {
    const { membership } = await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER']);
    if (input.items.length === 0) return { error: 'No items on the order.' };

    // Resolve menu items in ONE org-scoped fetch and refuse any item that does
    // not belong to this kitchen — a cross-tenant corruption guard (mirrors
    // retail.ts createOrder).
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
        type: input.type ?? 'DINE_IN',
        tableId,
        orderNumber,
        paymentMethod: input.paymentMethod ?? null,
        paidAt: paid ? new Date() : null,
        status: paid ? 'COMPLETED' : 'PENDING',
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
    return { success: true, orderId: order.id, orderNumber, totalAmount };
  } catch (error) {
    console.error('Error creating POS order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to place order.' };
  }
}

/** KDS / counter mutation: move an order through its status flow. */
export async function updateOrderStatus(
  orderId: string,
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED',
) {
  try {
    const order = await db.orm.public.RestaurantOrder.where({ id: orderId }).all().first();
    if (!order) return { error: 'Order not found.' };
    await requireMembership(order.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']);

    const paid = status === 'COMPLETED';
    await db.orm.public.RestaurantOrder.where({ id: orderId }).update({
      status,
      paidAt: paid && !order.paidAt ? new Date() : order.paidAt,
    });
    revalidatePath('/admin/restaurantos');
    return { success: true, status };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update order.' };
  }
}

// __APPEND__
