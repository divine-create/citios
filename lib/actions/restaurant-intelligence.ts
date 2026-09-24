'use server';

import { db } from '@/src/prisma/db';
import { requireMembership } from './tenant';
import { getRestaurantOSSettings } from './restaurantos';
import { getRestaurantDayBounds } from '@/lib/restaurant-time';

// ---------------------------------------------------------------------------
// Internal helper: resolve IANA timezone for a given locationId
// ---------------------------------------------------------------------------

async function resolveLocationTimezone(locationId?: string): Promise<string> {
  if (!locationId) return 'UTC';
  const loc = await db.orm.public.Location.where({ id: locationId }).all().first();
  return (loc as any)?.timezone ?? 'UTC';
}

// ---------------------------------------------------------------------------
// getOverviewContext — org name, location name, active shift, timezone
// ---------------------------------------------------------------------------

export async function getOverviewContext(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();

  let locName = 'All Locations';
  let timezone = 'UTC';
  if (locationId) {
    const loc = await db.orm.public.Location.where({ id: locationId }).all().first();
    if (loc) {
      locName = (loc as any).name;
      timezone = (loc as any).timezone ?? 'UTC';
    }
  }

  // Active shift: load all open shifts then filter by location if provided
  const openShifts = await db.orm.public.RestaurantShift
    .where({ organizationId, status: 'OPEN' })
    .all();
  const shift = locationId
    ? (openShifts as any[]).find((s) => s.locationId === locationId)
    : (openShifts as any[])[0];

  return {
    organizationName: (org as any)?.name ?? 'Restaurant',
    locationName: locName,
    timezone,
    shift: shift ? JSON.parse(JSON.stringify(shift)) : null,
  };
}

// ---------------------------------------------------------------------------
// getOverviewAlerts — actionable conditions needing attention
// ---------------------------------------------------------------------------

export async function getOverviewAlerts(
  organizationId: string,
  locationId?: string,
) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  const settings: any = await getRestaurantOSSettings(organizationId);
  // Use configurable threshold, default 20 mins
  const overdueMinutes: number = settings?.kitchenOverdueMinutes ?? 20;
  const overdueThreshold = new Date(Date.now() - overdueMinutes * 60 * 1000);

  // Kitchen overdue: orders in PENDING or PREPARING that have exceeded threshold
  // Timer is based on order.createdAt — "how long has the customer been waiting"
  const allOrders = await db.orm.public.RestaurantOrder
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  let overdueTickets = 0;
  for (const o of allOrders as any[]) {
    if (
      ['PENDING', 'PREPARING'].includes(o.status) &&
      new Date(o.createdAt) < overdueThreshold
    ) {
      overdueTickets++;
    }
  }

  // Low stock — location-scoped inventory
  let lowStockCount = 0;
  if (settings?.enableInventory) {
    const inv = await db.orm.public.RestaurantInventoryItem
      .where(locationId ? { organizationId, locationId } : { organizationId })
      .all();
    lowStockCount = (inv as any[]).filter(
      (i) => i.lowStockLevel != null && i.quantity <= i.lowStockLevel,
    ).length;
  }

  // Missing recipes — MenuItem IS location-scoped
  let missingRecipes = 0;
  if (settings?.enableRecipes) {
    const menu = await db.orm.public.MenuItem
      .where(locationId ? { organizationId, locationId } : { organizationId })
      .all();
    missingRecipes = (menu as any[]).filter((m) => !m.recipeId).length;
  }

  // Missing cost basis — same location scope
  let missingCost = 0;
  if (settings?.enableFoodCosting) {
    const menu = await db.orm.public.MenuItem
      .where(locationId ? { organizationId, locationId } : { organizationId })
      .all();
    for (const m of menu as any[]) {
      if (settings.enableRecipes && !m.recipeId) missingCost++;
      else if (!settings.enableRecipes && !m.inventoryItemId) missingCost++;
    }
  }

  return { overdueTickets, overdueMinutes, lowStockCount, missingRecipes, missingCost };
}

// ---------------------------------------------------------------------------
// getLiveService — open / preparing / ready orders + tables
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
// getOverviewSales — today's completed-order revenue + COGS (N+1 eliminated)
//
// COGS SEMANTICS (preserved from Phase C.1):
//   SUM(OrderItem.unitCost × OrderItem.quantity)
//   where unitCost is the historical snapshot frozen at order-creation time.
//   This never reflects subsequent recipe or ingredient cost changes.
// ---------------------------------------------------------------------------

export async function getOverviewSales(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  // Use restaurant-local timezone for day boundaries
  const tz = await resolveLocationTimezone(locationId);
  const { start, end } = getRestaurantDayBounds(tz);

  // Fetch all orders for location (Prisma Next doesn't support date-range WHERE natively)
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

  // COGS: single pass — fetch all OrderItems for completed orders in one batch
  // then aggregate in-process.  This is O(completed_orders) queries eliminated
  // down to a single scan of the OrderItem table filtered by orderId set.
  let cogs = 0;
  let cogsAvailable = false;

  if (completedOrderIds.length > 0) {
    // Fetch all order items for all completed orders — one query per batch.
    // Prisma Next does not support WHERE orderId IN [...] directly, so we
    // fetch all items for the organization and filter in-memory.  This is
    // far better than the previous N+1 (one query per order).
    const allItems = await db.orm.public.OrderItem.all();
    const completedSet = new Set(completedOrderIds);
    let itemsFound = 0;
    for (const item of allItems as any[]) {
      if (completedSet.has(item.orderId)) {
        cogs += (item.unitCost ?? 0) * (item.quantity ?? 1);
        itemsFound++;
      }
    }
    cogsAvailable = itemsFound > 0;
  }

  const avgOrderValue = orderCount > 0 ? grossSales / orderCount : 0;
  // Guard: if grossSales is 0, margin is not "0%" — it's unavailable
  const theoreticalMargin =
    grossSales > 0 && cogsAvailable
      ? ((grossSales - cogs) / grossSales) * 100
      : null;

  return {
    grossSales,
    orderCount,
    avgOrderValue,
    cogs,
    cogsAvailable,
    theoreticalMargin, // null = unavailable, negative = COGS > sales (expose truthfully)
    reportingDay: { start: start.toISOString(), end: end.toISOString(), timezone: tz },
  };
}

// ---------------------------------------------------------------------------
// getOverviewInventory — low/out of stock + today's waste (location-correct)
// ---------------------------------------------------------------------------

export async function getOverviewInventory(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  const tz = await resolveLocationTimezone(locationId);
  const { start, end } = getRestaurantDayBounds(tz);

  // Inventory items — location-scoped
  const inv = await db.orm.public.RestaurantInventoryItem
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  const lowStock: any[] = [];
  const outOfStock: any[] = [];
  const invIds = new Set((inv as any[]).map((i) => i.id));

  for (const i of inv as any[]) {
    if (i.quantity <= 0) outOfStock.push(i);
    else if (i.lowStockLevel != null && i.quantity <= i.lowStockLevel) lowStock.push(i);
  }

  // Waste movements — RestaurantStockMovement has no locationId directly.
  // Location is inherited through inventoryItemId → RestaurantInventoryItem.locationId
  // Solution: fetch all org-level movements for WASTE type today, then filter
  // by whether the itemId belongs to this location's inventory item set.
  const allMovements = await db.orm.public.RestaurantStockMovement
    .where({ organizationId })
    .all();

  let wasteValue = 0;
  let wasteCount = 0;
  let wasteValueKnown = false;

  for (const m of allMovements as any[]) {
    if (m.type !== 'WASTE') continue;
    const d = new Date(m.createdAt);
    if (d < start || d > end) continue;
    // Location filter via the inventory-item membership set
    if (locationId && !invIds.has(m.itemId)) continue;
    wasteCount++;
    if (m.unitCost != null && m.unitCost > 0) {
      wasteValue += Math.abs(m.delta ?? 0) * m.unitCost;
      wasteValueKnown = true;
    }
  }

  return {
    totalItems: inv.length,
    lowStockItems: lowStock.slice(0, 5).map((i) => ({
      id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, lowStockLevel: i.lowStockLevel,
    })),
    outOfStockItems: outOfStock.slice(0, 5).map((i) => ({ id: i.id, name: i.name, unit: i.unit })),
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    wasteCount,
    wasteValue,
    wasteValueKnown, // false = quantity known but monetary value unavailable
  };
}

// ---------------------------------------------------------------------------
// getOverviewReservations — upcoming reservations in restaurant-local time
// ---------------------------------------------------------------------------

export async function getOverviewReservations(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  const tz = await resolveLocationTimezone(locationId);
  const { end } = getRestaurantDayBounds(tz);
  const now = new Date();
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
// getOverviewShift — current or last-closed shift
// ---------------------------------------------------------------------------

export async function getOverviewShift(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  const allShifts = await db.orm.public.RestaurantShift
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

  const sorted = (allShifts as any[]).sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
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
// getConfigurationHealth — config gaps that affect operations
// MenuItem IS location-scoped (locationId field confirmed in schema)
// ---------------------------------------------------------------------------

export async function getConfigurationHealth(organizationId: string, locationId?: string) {
  await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER'], locationId);
  const settings: any = await getRestaurantOSSettings(organizationId);

  // MenuItem has locationId — must scope by location when provided
  const menu = await db.orm.public.MenuItem
    .where(locationId ? { organizationId, locationId } : { organizationId })
    .all();

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
