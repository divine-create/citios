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
      scheduledAt: (globalThis as any).Temporal.Instant.fromEpochMilliseconds(scheduled.getTime()),
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
        paidAt: paid ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) : null,
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
      paidAt: paid && !order.paidAt ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()) : order.paidAt,
    });
    revalidatePath('/admin/restaurantos');

    if (order.customerDataId) {
      const personId = await personIdForCustomerData(order.customerDataId);
      if (personId) {
        const statusTitles: Record<string, string> = {
          PREPARING: 'Kitchen Preparing Your Meal',
          READY: 'Order Ready for Pickup',
          DELIVERING: 'Order Out for Delivery',
          COMPLETED: 'Order Completed & Paid',
          CANCELLED: 'Order Cancelled',
        };
        await notifyPerson(personId, {
          type: 'FOOD_ORDER_CONFIRMED',
          title: statusTitles[status] || `Order Status: ${status}`,
          body: `Your food order #${order.orderNumber ?? order.id.slice(0, 8)} is now ${status.toLowerCase()}.`,
          href: `/orders`,
        });
      }
    }

    // Broadcast ticket status update to kitchen display / counter
    pusherServer.trigger(`org-${order.organizationId}`, 'ticket-status-changed', {
      orderId,
      status,
      orderNumber: order.orderNumber,
    }).catch(() => {});

    return { success: true, status };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update order.' };
  }
}

// ---------------------------------------------------------------------------
// Inventory (all styles)
// ---------------------------------------------------------------------------

export async function getInventoryItems(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const items = await db.orm.public.RestaurantInventoryItem.where({ organizationId }).all();
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
      cost: input.cost ?? null,
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
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);

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
    await requireMembership(item.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

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

    const next = Math.max(0, item.quantity + delta);
    await db.orm.public.RestaurantInventoryItem.where({ id: itemId }).update({ quantity: next });
    await db.orm.public.RestaurantStockMovement.create({
      organizationId: item.organizationId,
      itemId,
      delta,
      note: note ?? (delta > 0 ? 'Restock' : 'Usage'),
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

export async function getExpenses(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const expenses = await db.orm.public.RestaurantExpense.where({ organizationId }).all();
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
      cityId: city.id,
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
    const [settings, menu, tables, reservations, tickets, orders, inventory, expenses] =
      await Promise.all([
        getRestaurantOSSettings(organizationId),
        getMenuItems(organizationId),
        getTables(organizationId),
        getReservations(organizationId),
        getKitchenTickets(organizationId),
        getOrders(organizationId, { limit: 50 }),
        getInventoryItems(organizationId),
        getExpenses(organizationId),
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
    }));
  } catch (error) {
    console.error('Error fetching RestaurantOS data:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Suppliers (shared RetailSupplier table, scoped by organizationId)
// ---------------------------------------------------------------------------

export async function getSuppliers(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const suppliers = await db.orm.public.RetailSupplier.where({ organizationId }).all();
    const sorted = [...suppliers].sort((a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return JSON.parse(JSON.stringify(sorted));
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
}

export async function createSupplier(input: {
  organizationId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  leadTimeDays?: number;
  paymentTerms?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);
    if (!input.name.trim()) return { error: 'Supplier name is required.' };

    const supplier = await db.orm.public.RetailSupplier.create({
      organizationId: input.organizationId,
      name: input.name.trim(),
      contactName: input.contactName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      paymentTerms: input.paymentTerms ?? null,
    });
    revalidatePath('/admin/restaurantos');
    return JSON.parse(JSON.stringify(supplier));
  } catch (error) {
    console.error('Error creating supplier:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create supplier.' };
  }
}

export async function updateSupplier(
  supplierId: string,
  input: Partial<{ name: string; contactName: string; email: string; phone: string; leadTimeDays: number; paymentTerms: string }>,
) {
  try {
    const supplier = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();
    if (!supplier) return { error: 'Supplier not found.' };
    await requireMembership(supplier.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);

    await db.orm.public.RetailSupplier.where({ id: supplierId }).update(input);
    const updated = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();
    revalidatePath('/admin/restaurantos');
    return JSON.parse(JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update supplier.' };
  }
}

export async function deleteSupplier(supplierId: string) {
  try {
    const supplier = await db.orm.public.RetailSupplier.where({ id: supplierId }).all().first();
    if (!supplier) return { error: 'Supplier not found.' };
    await requireMembership(supplier.organizationId, ['OWNER', 'ADMIN', 'MANAGER']);

    await db.orm.public.RetailSupplier.where({ id: supplierId }).delete();
    revalidatePath('/admin/restaurantos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete supplier.' };
  }
}

// ---------------------------------------------------------------------------
// Purchase Orders (shared RetailPurchaseOrder table, scoped by organizationId)
// ---------------------------------------------------------------------------

export async function getPurchaseOrders(organizationId: string) {
  try {
    await requireMembership(organizationId);
    const pos = await db.orm.public.RetailPurchaseOrder.where({ organizationId }).all();
    const suppliers = await db.orm.public.RetailSupplier.where({ organizationId }).all();
    const sorted = [...pos].sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return JSON.parse(JSON.stringify(
      sorted.map((po: any) => ({
        ...po,
        supplierName: suppliers.find((s: any) => s.id === po.supplierId)?.name ?? 'Unknown',
      })),
    ));
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
}

export async function createPurchaseOrder(input: {
  organizationId: string;
  supplierId: string;
  poNumber?: string;
  totalAmount?: number;
  expectedDate?: string;
  notes?: string;
}) {
  try {
    await requireMembership(input.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);

    // Verify supplier belongs to this org
    const supplier = await db.orm.public.RetailSupplier
      .where({ id: input.supplierId, organizationId: input.organizationId })
      .all()
      .first();
    if (!supplier) return { error: 'Supplier not found for this organisation.' };

    // Auto-generate PO number if not provided
    const existing = await db.orm.public.RetailPurchaseOrder.where({ organizationId: input.organizationId }).all();
    const poNumber = input.poNumber?.trim() || `PO-${String(existing.length + 1).padStart(4, '0')}`;

    const po = await db.orm.public.RetailPurchaseOrder.create({
      organizationId: input.organizationId,
      supplierId: input.supplierId,
      poNumber,
      status: 'DRAFT',
      totalAmount: input.totalAmount ?? null,
      expectedDate: input.expectedDate ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(new Date(input.expectedDate).getTime()) : null,
    });
    revalidatePath('/admin/restaurantos');
    return JSON.parse(JSON.stringify(po));
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create purchase order.' };
  }
}

export async function updatePurchaseOrderStatus(
  poId: string,
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED',
) {
  try {
    const po = await db.orm.public.RetailPurchaseOrder.where({ id: poId }).all().first();
    if (!po) return { error: 'Purchase order not found.' };
    await requireMembership(po.organizationId, ['OWNER', 'ADMIN', 'MANAGER', 'INVENTORY_STAFF']);

    await db.orm.public.RetailPurchaseOrder.where({ id: poId }).update({ status });
    revalidatePath('/admin/restaurantos');
    return { success: true, status };
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    return { error: error instanceof Error ? error.message : 'Failed to update purchase order.' };
  }
}
