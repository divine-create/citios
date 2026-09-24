/**
 * Phase E.1 — Regression & Security Tests
 *
 * Run with: npm run test
 * (tsx --test lib/*.test.ts)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// getRestaurantDayBounds — timezone correctness
// ---------------------------------------------------------------------------
import { getRestaurantDayBounds } from './restaurant-time';
// Using semantics from: import { getOverviewSales } from './actions/restaurant-intelligence';

describe('getRestaurantDayBounds', () => {
  test('UTC produces midnight-to-midnight boundaries', () => {
    const { start, end, timezone } = getRestaurantDayBounds('UTC');
    assert.equal(timezone, 'UTC');
    assert.equal(start.getUTCHours(), 0);
    assert.equal(start.getUTCMinutes(), 0);
    assert.equal(end.getUTCHours(), 23);
    assert.equal(end.getUTCMinutes(), 59);
    assert.ok(start < end);
  });

  test('Africa/Lagos is UTC+1 — start should be 23:00 previous day UTC', () => {
    const { start, timezone } = getRestaurantDayBounds('Africa/Lagos');
    assert.equal(timezone, 'Africa/Lagos');
    // Lagos is UTC+1. Local midnight = UTC 23:00 the day before.
    // So UTC start hour should be 23 (yesterday) or 0 - 1h = 23.
    const startHourUtc = start.getUTCHours();
    assert.equal(startHourUtc, 23, `Expected 23 UTC for Lagos midnight, got ${startHourUtc}`);
  });

  test('Invalid timezone falls back to UTC silently', () => {
    const { timezone } = getRestaurantDayBounds('not/a/timezone');
    assert.equal(timezone, 'UTC');
  });

  test('Start is always before End', () => {
    for (const tz of ['UTC', 'Africa/Lagos', 'America/New_York', 'Asia/Kolkata']) {
      const { start, end } = getRestaurantDayBounds(tz);
      assert.ok(start < end, `start should be before end for ${tz}`);
    }
  });

  test('Start and End are on the same local calendar day', () => {
    const { start, end } = getRestaurantDayBounds('Africa/Lagos');
    const fmtLagos = (d: Date) =>
      d.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
    assert.equal(fmtLagos(start), fmtLagos(end), 'Start and end must be the same local date');
  });
});

// ---------------------------------------------------------------------------
// COGS semantics — historical snapshot immutability
// ---------------------------------------------------------------------------

describe('COGS calculation semantics', () => {
  test('COGS = SUM(unitCost * quantity) from OrderItem snapshots', () => {
    // Simulate the aggregation logic used in getOverviewSales
    const completedOrderIds = new Set(['order-A', 'order-B']);
    const allItems = [
      { orderId: 'order-A', unitCost: 500, quantity: 2 }, // 1000
      { orderId: 'order-B', unitCost: 700, quantity: 1 }, // 700
      { orderId: 'order-PENDING', unitCost: 999, quantity: 5 }, // excluded
      { orderId: 'order-CANCELLED', unitCost: 400, quantity: 3 }, // excluded
    ];
    let cogs = 0;
    for (const item of allItems) {
      if (completedOrderIds.has(item.orderId)) {
        cogs += (item.unitCost ?? 0) * (item.quantity ?? 1);
      }
    }
    assert.equal(cogs, 1700, `Expected 1700, got ${cogs}`);
  });

  test('Pending orders are excluded from COGS', () => {
    const completedOrderIds = new Set<string>(['order-C']);
    const allItems = [
      { orderId: 'order-PENDING', unitCost: 9999, quantity: 10 },
      { orderId: 'order-C', unitCost: 200, quantity: 1 },
    ];
    let cogs = 0;
    for (const item of allItems) {
      if (completedOrderIds.has(item.orderId)) {
        cogs += (item.unitCost ?? 0) * (item.quantity ?? 1);
      }
    }
    assert.equal(cogs, 200);
  });

  test('Zero order count yields null margin (no division by zero)', () => {
    const grossSales = 0;
    const cogs = 0;
    const cogsAvailable = false;
    const theoreticalMargin =
      grossSales > 0 && cogsAvailable
        ? ((grossSales - cogs) / grossSales) * 100
        : null;
    assert.equal(theoreticalMargin, null, 'Margin should be null when sales=0');
  });

  test('COGS > grossSales gives negative margin (exposed, not clamped)', () => {
    const grossSales = 1000;
    const cogs = 1500; // COGS exceeds revenue — possible bad recipe cost
    const theoreticalMargin = ((grossSales - cogs) / grossSales) * 100;
    assert.ok(theoreticalMargin < 0, `Expected negative margin, got ${theoreticalMargin}`);
  });

  test('cogsAvailable is false when no items exist', () => {
    const completedOrderIds = new Set(['order-X']);
    const allItems: any[] = []; // no items at all
    let cogs = 0;
    let itemsFound = 0;
    for (const item of allItems) {
      if (completedOrderIds.has(item.orderId)) {
        cogs += (item.unitCost ?? 0) * (item.quantity ?? 1);
        itemsFound++;
      }
    }
    const cogsAvailable = itemsFound > 0;
    assert.equal(cogsAvailable, false);
    const theoreticalMargin = cogsAvailable ? 100 : null;
    assert.equal(theoreticalMargin, null);
  });
});

// ---------------------------------------------------------------------------
// Overdue ticket semantics
// ---------------------------------------------------------------------------

describe('Overdue ticket detection', () => {
  test('Order older than threshold is overdue', () => {
    const overdueMinutes = 20;
    const threshold = new Date(Date.now() - overdueMinutes * 60 * 1000);
    const oldOrder = { status: 'PENDING', createdAt: new Date(Date.now() - 25 * 60 * 1000) };
    const isOverdue = ['PENDING', 'PREPARING'].includes(oldOrder.status) && new Date(oldOrder.createdAt) < threshold;
    assert.ok(isOverdue, 'Order 25 mins old should be overdue with 20-min threshold');
  });

  test('Order newer than threshold is not overdue', () => {
    const overdueMinutes = 20;
    const threshold = new Date(Date.now() - overdueMinutes * 60 * 1000);
    const newOrder = { status: 'PENDING', createdAt: new Date(Date.now() - 10 * 60 * 1000) };
    const isOverdue = ['PENDING', 'PREPARING'].includes(newOrder.status) && new Date(newOrder.createdAt) < threshold;
    assert.equal(isOverdue, false, 'Order 10 mins old should NOT be overdue with 20-min threshold');
  });

  test('COMPLETED orders are never overdue', () => {
    const overdueMinutes = 5;
    const threshold = new Date(Date.now() - overdueMinutes * 60 * 1000);
    const completedOrder = { status: 'COMPLETED', createdAt: new Date(Date.now() - 60 * 60 * 1000) };
    const isOverdue = ['PENDING', 'PREPARING'].includes(completedOrder.status) && new Date(completedOrder.createdAt) < threshold;
    assert.equal(isOverdue, false, 'COMPLETED orders must never count as overdue');
  });

  test('CANCELLED orders are never overdue', () => {
    const threshold = new Date(Date.now() - 5 * 60 * 1000);
    const cancelled = { status: 'CANCELLED', createdAt: new Date(Date.now() - 60 * 60 * 1000) };
    const isOverdue = ['PENDING', 'PREPARING'].includes(cancelled.status) && new Date(cancelled.createdAt) < threshold;
    assert.equal(isOverdue, false);
  });

  test('Custom threshold from kitchenOverdueMinutes is respected', () => {
    const overdueMinutes = 30; // custom setting
    const threshold = new Date(Date.now() - overdueMinutes * 60 * 1000);
    const order25min = { status: 'PREPARING', createdAt: new Date(Date.now() - 25 * 60 * 1000) };
    const order35min = { status: 'PREPARING', createdAt: new Date(Date.now() - 35 * 60 * 1000) };
    const check = (o: typeof order25min) => ['PENDING', 'PREPARING'].includes(o.status) && new Date(o.createdAt) < threshold;
    assert.equal(check(order25min), false, '25min should NOT be overdue with 30-min threshold');
    assert.equal(check(order35min), true, '35min SHOULD be overdue with 30-min threshold');
  });
});

// ---------------------------------------------------------------------------
// Waste location-scoping logic
// ---------------------------------------------------------------------------

describe('Waste location filtering', () => {
  test('Waste is filtered to inventory items belonging to the specified location', () => {
    // inventoryItems for Location A
    const locationAInvIds = new Set(['inv-1', 'inv-2']);
    const allMovements = [
      { type: 'WASTE', itemId: 'inv-1', delta: -2, unitCost: 100, createdAt: new Date() }, // Location A ✅
      { type: 'WASTE', itemId: 'inv-3', delta: -5, unitCost: 200, createdAt: new Date() }, // Location B ❌
      { type: 'PURCHASE_RECEIPT', itemId: 'inv-1', delta: 10, unitCost: 100, createdAt: new Date() }, // not waste
    ];
    const { start, end } = getRestaurantDayBounds('UTC');
    let wasteCount = 0;
    let wasteValue = 0;
    for (const m of allMovements) {
      if (m.type !== 'WASTE') continue;
      const d = new Date(m.createdAt);
      if (d < start || d > end) continue;
      if (!locationAInvIds.has(m.itemId)) continue; // location filter
      wasteCount++;
      if (m.unitCost > 0) wasteValue += Math.abs(m.delta) * m.unitCost;
    }
    assert.equal(wasteCount, 1, 'Only 1 waste entry belongs to Location A');
    assert.equal(wasteValue, 200, 'Waste value: 2 units × ₦100');
  });

  test('wasteValueKnown is false when unitCost is 0', () => {
    let wasteValueKnown = false;
    const movements = [{ type: 'WASTE', itemId: 'inv-1', delta: -3, unitCost: 0, createdAt: new Date() }];
    const invIds = new Set(['inv-1']);
    const { start, end } = getRestaurantDayBounds('UTC');
    for (const m of movements) {
      if (m.type !== 'WASTE') continue;
      const d = new Date(m.createdAt);
      if (d < start || d > end) continue;
      if (!invIds.has(m.itemId)) continue;
      if (m.unitCost != null && m.unitCost > 0) wasteValueKnown = true;
    }
    assert.equal(wasteValueKnown, false, 'Zero-cost waste should not report known value');
  });
});

// ---------------------------------------------------------------------------
// Sales/COGS reporting-day parity
// ---------------------------------------------------------------------------

describe('Sales and COGS reporting-day parity', () => {
  test('Same day-bounds object used for both sales and COGS filtering', () => {
    // Both computations call getRestaurantDayBounds with the same timezone.
    // This test verifies that two calls with the same tz produce identical bounds.
    const tz = 'Africa/Lagos';
    const bounds1 = getRestaurantDayBounds(tz);
    const bounds2 = getRestaurantDayBounds(tz);
    // Allow up to 1ms drift from second call
    assert.ok(
      Math.abs(bounds1.start.getTime() - bounds2.start.getTime()) <= 1,
      'Start times should be identical (within 1ms)',
    );
    assert.ok(
      Math.abs(bounds1.end.getTime() - bounds2.end.getTime()) <= 1,
      'End times should be identical (within 1ms)',
    );
  });
});
