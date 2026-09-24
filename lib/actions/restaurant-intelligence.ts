'use server';

import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';
import { getRestaurantOSSettings } from './restaurantos';

// ---------------------------------------------------------------------------
// Time Helpers
// ---------------------------------------------------------------------------

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ---------------------------------------------------------------------------
// getOverviewContext — org name, location, active shift
// ---------------------------------------------------------------------------

export async function getOverviewContext(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();

  let locName = 'All Locations';
  if (locationId) {
    const loc = await db.orm.public.Location.where({ id: locationId }).all().first();
    if (loc) locName = loc.name;
  }

  // Active shift for this org+location
  const allShifts = await db.orm.public.RestaurantShift.where({ organizationId, status: 'OPEN' }).all();
  const shift = locationId
    ? allShifts.find((s: any) => s.locationId === locationId)
    : allShifts[0];

  return {
    organizationName: (org as any)?.name ?? 'Restaurant',
    locationName: locName,
    shift: shift ? JSON.parse(JSON.stringify(shift)) : null,
  };
}

// ---------------------------------------------------------------------------
// getOverviewAlerts — actionable conditions needing attention
// ---------------------------------------------------------------------------

export async function getOverviewAlerts(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  // Kitchen: overdue tickets (PENDING/PREPARING older than 20 mins)
  const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
  const allOrders = await db.orm.public.RestaurantOrder
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  let overdueTickets = 0;
  for (const o of allOrders as any[]) {
    if (
      ['PENDING', 'PREPARING'].includes(o.status) &&
      new Date(o.createdAt) < twentyMinsAgo
    ) {
      overdueTickets++;
    }
  }

  // Inventory: low stock
  let lowStockCount = 0;
  const settings: any = await getRestaurantOSSettings(organizationId);
  if (settings?.enableInventory) {
    const inv = await db.orm.public.RestaurantInventoryItem
      .where(locationId ? { organizationId, locationId } : { organizationId })
      .all();
    lowStockCount = (inv as any[]).filter(
      (i) => i.lowStockLevel != null && i.quantity <= i.lowStockLevel
    ).length;
  }

  // Configuration: menu items missing recipes (when recipes enabled)
  let missingRecipes = 0;
  if (settings?.enableRecipes) {
    const menu = await db.orm.public.MenuItem.where({ organizationId }).all();
    missingRecipes = (menu as any[]).filter((m) => !m.recipeId).length;
  }

  // Configuration: menu items missing cost (when food costing enabled)
  let missingCost = 0;
  if (settings?.enableFoodCosting) {
    const menu = await db.orm.public.MenuItem.where({ organizationId }).all();
    for (const m of menu as any[]) {
      if (settings.enableRecipes && !m.recipeId) missingCost++;
      else if (!settings.enableRecipes && !m.inventoryItemId) missingCost++;
    }
  }

  return { overdueTickets, lowStockCount, missingRecipes, missingCost };
}

// ---------------------------------------------------------------------------
// getLiveService — open orders, ready orders, occupied tables
// ---------------------------------------------------------------------------

export async function getLiveService(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  const orders = await db.orm.public.RestaurantOrder
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  let openOrders = 0;
  let preparingOrders = 0;
  let readyOrders = 0;

  for (const o of orders as any[]) {
    if (o.status === 'PENDING') openOrders++;
    if (o.status === 'PREPARING') preparingOrders++;
    if (o.status === 'READY') readyOrders++;
  }

  const tables = await db.orm.public.RestaurantTable
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();
  const activeTables = (tables as any[]).filter((t) => t.status === 'OCCUPIED').length;
  const totalTables = tables.length;

  return { openOrders, preparingOrders, readyOrders, activeTables, totalTables };
}

// ---------------------------------------------------------------------------
// getOverviewSales — today's completed-order revenue + COGS
// ---------------------------------------------------------------------------

export async function getOverviewSales(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  const { start, end } = getTodayBounds();

  const allOrders = await db.orm.public.RestaurantOrder
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  let grossSales = 0;
  let orderCount = 0;
  const completedOrderIds: string[] = [];

  for (const o of allOrders as any[]) {
    const d = new Date(o.createdAt);
    if (d >= start && d <= end && o.status === 'COMPLETED') {
      orderCount++;
      grossSales += o.totalAmount ?? 0;
      completedOrderIds.push(o.id);
    }
  }

  // COGS: sum of (unitCost * quantity) for completed orders' line items
  let cogs = 0;
  if (completedOrderIds.length > 0) {
    for (const orderId of completedOrderIds) {
      const items = await db.orm.public.OrderItem.where({ orderId }).all();
      for (const item of items as any[]) {
        cogs += (item.unitCost ?? 0) * (item.quantity ?? 1);
      }
    }
  }

  const avgOrderValue = orderCount > 0 ? grossSales / orderCount : 0;
  const theoreticalMargin = grossSales > 0 ? ((grossSales - cogs) / grossSales) * 100 : 0;

  return {
    grossSales,
    orderCount,
    avgOrderValue,
    cogs,
    theoreticalMargin,
    hasCogs: cogs > 0,
  };
}

// ---------------------------------------------------------------------------
// getOverviewInventory — low/out of stock summary, today's waste
// ---------------------------------------------------------------------------

export async function getOverviewInventory(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  const { start, end } = getTodayBounds();

  const inv = await db.orm.public.RestaurantInventoryItem
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  const lowStock: any[] = [];
  const outOfStock: any[] = [];

  for (const i of inv as any[]) {
    if (i.quantity <= 0) outOfStock.push(i);
    else if (i.lowStockLevel != null && i.quantity <= i.lowStockLevel) lowStock.push(i);
  }

  // Today's waste movements
  const allMovements = await db.orm.public.RestaurantStockMovement
    .where({ organizationId })
    .all();

  let wasteValue = 0;
  let wasteCount = 0;
  for (const m of allMovements as any[]) {
    const d = new Date(m.createdAt);
    if (m.type === 'WASTE' && d >= start && d <= end) {
      wasteCount++;
      wasteValue += Math.abs(m.delta) * (m.unitCost ?? 0);
    }
  }

  return {
    totalItems: inv.length,
    lowStockItems: lowStock.slice(0, 5).map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, lowStockLevel: i.lowStockLevel })),
    outOfStockItems: outOfStock.slice(0, 5).map((i) => ({ id: i.id, name: i.name, unit: i.unit })),
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    wasteValue,
    wasteCount,
  };
}

// ---------------------------------------------------------------------------
// getOverviewReservations — upcoming reservations today
// ---------------------------------------------------------------------------

export async function getOverviewReservations(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  const now = new Date();
  const { end } = getTodayBounds();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

  const reservations = await db.orm.public.RestaurantReservation
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  const upcoming: any[] = [];
  const arrivingSoon: any[] = [];

  for (const r of reservations as any[]) {
    const scheduledAt = new Date(r.scheduledAt);
    if (
      scheduledAt >= now &&
      scheduledAt <= end &&
      ['pending', 'confirmed'].includes(r.status)
    ) {
      upcoming.push(r);
      if (scheduledAt <= oneHourFromNow) arrivingSoon.push(r);
    }
  }

  return {
    upcomingCount: upcoming.length,
    arrivingSoonCount: arrivingSoon.length,
    arrivingSoon: arrivingSoon.slice(0, 3).map((r) => ({
      id: r.id,
      customerName: r.customerName ?? 'Guest',
      partySize: r.partySize,
      scheduledAt: r.scheduledAt,
      status: r.status,
    })),
  };
}

// ---------------------------------------------------------------------------
// getOverviewShift — current or last shift summary
// ---------------------------------------------------------------------------

export async function getOverviewShift(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  const allShifts = await db.orm.public.RestaurantShift
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  // Sort by openedAt descending to get the most recent
  const sorted = (allShifts as any[]).sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  );

  const activeShift = sorted.find((s) => s.status === 'OPEN');
  const lastClosed = !activeShift ? sorted.find((s) => s.status === 'CLOSED') : null;
  const shift = activeShift ?? lastClosed;

  if (!shift) return null;

  return {
    id: shift.id,
    status: shift.status,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt ?? null,
    openingFloat: shift.openingFloat ?? 0,
    expectedCash: shift.expectedCash ?? null,
    actualCash: shift.actualCash ?? null,
    variance: shift.variance ?? null,
  };
}

// ---------------------------------------------------------------------------
// getConfigurationHealth — gaps in config that affect operations
// ---------------------------------------------------------------------------

export async function getConfigurationHealth(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  const settings: any = await getRestaurantOSSettings(organizationId);

  const menu = await db.orm.public.MenuItem.where({ organizationId }).all();
  let missingRecipes = 0;
  let missingCost = 0;
  let unavailableItems = 0;

  for (const m of menu as any[]) {
    if (!m.isAvailable) unavailableItems++;
    if (settings?.enableRecipes && !m.recipeId) missingRecipes++;
    if (settings?.enableFoodCosting) {
      if (settings?.enableRecipes && !m.recipeId) missingCost++;
      else if (!settings?.enableRecipes && !m.inventoryItemId) missingCost++;
    }
  }

  return { missingRecipes, missingCost, unavailableItems, totalMenuItems: menu.length };
}
