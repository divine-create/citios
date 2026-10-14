/**
 * Resident Activity — read/composition layer.
 *
 * NOT a 'use server' module on purpose: every export of a 'use server' file is
 * callable from the browser. These functions take `personId` and therefore must
 * only be invoked by server code that has already resolved the session
 * (see app/actions/activity.ts).
 *
 * Ownership chain (authoritative, from contract.prisma):
 *   Person ──► CustomerData.personId                      (direct link)
 *   Person ──► Relationship(personId) ──► CustomerData    (per-merchant link)
 *   CustomerData ──► RetailOrder | RestaurantOrder | ServiceJob (customerDataId)
 *
 * This layer is strictly read-only. It never writes Payment, Wallet, Ledger,
 * orders, ServiceJob or DeliveryJob.
 *
 * Activity timestamp rule (`activityAt`): the authoritative `createdAt` of the
 * vertical commercial record (the moment the resident acted). Payment/delivery
 * timestamps are NOT mixed into ordering; `updatedAt` is exposed separately.
 */
import { Temporal } from '@js-temporal/polyfill';
import { db } from '@/src/prisma/db';
import { loadDeliveryForOwnedSource, type ResidentDelivery } from '@/lib/resident-logistics/read';
import { isDeliveryDelayed } from '@/lib/resident-logistics/status';
import {
  type StatusView,
  retailOrderStatusView,
  restaurantOrderStatusView,
  serviceJobStatusView,
  paymentStatusView,
  refundRequestStatusView,
  deliveryStatusView,
  headlineStatus,
} from './status';

export type ActivityKind = 'shop' | 'restaurant' | 'service';
export type ActivitySourceType = 'RETAIL_ORDER' | 'RESTAURANT_ORDER' | 'SERVICE_JOB';

export const ACTIVITY_SOURCE_TYPES: readonly ActivitySourceType[] = ['RETAIL_ORDER', 'RESTAURANT_ORDER', 'SERVICE_JOB'];

/**
 * How the displayed amount should be read. ServiceOS has no quote→payment
 * orchestration yet, so a service amount is never presented as "paid".
 */
export type AmountKind = 'order_total' | 'quote' | 'base_price' | 'none';

export type ResidentActivityItem = {
  key: string;
  sourceType: ActivitySourceType;
  sourceId: string;
  kind: ActivityKind;
  merchantId: string;
  merchantName: string;
  title: string;
  amount: number | null;
  amountKind: AmountKind;
  currency: string | null;
  order: StatusView;
  payment: StatusView | null;
  paymentMethod: string | null;
  refund: StatusView | null;
  delivery: StatusView | null;
  /** Presentation hint only (no recent update); never changes the delivery state itself. */
  deliveryDelayed: boolean;
  headline: StatusView;
  /** ISO-8601 with full DB precision; also the pagination cursor. */
  activityAt: string;
  activityAtMs: number;
  updatedAtMs: number;
  href: string;
};

export type ResidentActivityPage = {
  items: ResidentActivityItem[];
  nextCursor: string | null;
  /** Sources whose query failed; the rest of the page still renders. */
  unavailable: ActivityKind[];
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// ─── helpers ──────────────────────────────────────────────────────────────────

type InstantLike = { epochMilliseconds: number; toString(): string } | string | Date;

function toMs(v: InstantLike | null | undefined): number {
  if (!v) return 0;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v instanceof Date) return v.getTime();
  return v.epochMilliseconds;
}

function toIso(v: InstantLike | null | undefined): string {
  if (!v) return new Date(0).toISOString();
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return v.toString();
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit)));
}

/** Parses an opaque cursor; returns null for anything malformed (treated as first page). */
export function parseCursor(cursor: string | null | undefined): Temporal.Instant | null {
  if (!cursor || typeof cursor !== 'string' || cursor.length > 64) return null;
  try {
    return Temporal.Instant.from(cursor);
  } catch {
    return null;
  }
}

function hrefFor(sourceType: ActivitySourceType, sourceId: string): string {
  return `/activity/${sourceType.toLowerCase()}/${encodeURIComponent(sourceId)}`;
}

export function isActivitySourceType(v: unknown): v is ActivitySourceType {
  return typeof v === 'string' && (ACTIVITY_SOURCE_TYPES as readonly string[]).includes(v);
}

// ─── ownership ────────────────────────────────────────────────────────────────

/**
 * Every CustomerData id that belongs to this Person, via both authoritative links.
 * This is the ONLY ownership boundary used by the activity layer.
 */
export async function resolveResidentCustomerIds(personId: string): Promise<string[]> {
  if (!personId) return [];
  const [direct, relationships] = await Promise.all([
    db.orm.public.CustomerData.where({ personId }).select('id').all(),
    db.orm.public.Relationship.where({ personId }).select('id').all(),
  ]);
  const ids = new Set<string>(direct.map((c) => c.id));
  const relIds = relationships.map((r) => r.id);
  if (relIds.length > 0) {
    const viaRel = await db.orm.public.CustomerData
      .where((c) => c.relationshipId.in(relIds))
      .select('id')
      .all();
    for (const c of viaRel) ids.add(c.id);
  }
  return [...ids];
}

// ─── per-source bounded queries (one query each, no per-row lookups) ──────────

type SourceRow = {
  sourceType: ActivitySourceType;
  id: string;
  organizationId: string;
  merchantName: string;
  createdAt: InstantLike;
  updatedAt: InstantLike;
  raw: Record<string, unknown>;
};

async function fetchRetail(customerIds: string[], before: Temporal.Instant | null, take: number): Promise<SourceRow[]> {
  let q = db.orm.public.RetailOrder.where((o) => o.customerDataId.in(customerIds));
  if (before) q = q.where((o) => o.createdAt.lt(before as never));
  const rows = await q
    .orderBy((o) => o.createdAt.desc())
    .limit(take)
    .include('organization', (org) => org.select('name'))
    .all();
  return rows.map((r) => ({
    sourceType: 'RETAIL_ORDER' as const,
    id: r.id,
    organizationId: r.organizationId,
    merchantName: r.organization?.name ?? 'Merchant',
    createdAt: r.createdAt as InstantLike,
    updatedAt: ((r as { updatedAt?: InstantLike }).updatedAt ?? r.createdAt) as InstantLike,
    raw: { status: r.status, fulfillmentStatus: r.fulfillmentStatus, totalAmount: r.totalAmount },
  }));
}

async function fetchRestaurant(customerIds: string[], before: Temporal.Instant | null, take: number): Promise<SourceRow[]> {
  let q = db.orm.public.RestaurantOrder.where((o) => o.customerDataId.in(customerIds));
  if (before) q = q.where((o) => o.createdAt.lt(before as never));
  const rows = await q
    .orderBy((o) => o.createdAt.desc())
    .limit(take)
    .include('organization', (org) => org.select('name'))
    .all();
  return rows.map((r) => ({
    sourceType: 'RESTAURANT_ORDER' as const,
    id: r.id,
    organizationId: r.organizationId,
    merchantName: r.organization?.name ?? 'Restaurant',
    createdAt: r.createdAt as InstantLike,
    updatedAt: ((r as { updatedAt?: InstantLike }).updatedAt ?? r.createdAt) as InstantLike,
    raw: { status: r.status, type: r.type, totalAmount: r.totalAmount },
  }));
}

async function fetchService(customerIds: string[], before: Temporal.Instant | null, take: number): Promise<SourceRow[]> {
  let q = db.orm.public.ServiceJob.where((j) => j.customerDataId.in(customerIds));
  if (before) q = q.where((j) => j.createdAt.lt(before as never));
  const rows = await q
    .orderBy((j) => j.createdAt.desc())
    .limit(take)
    .include('organization', (org) => org.select('name'))
    .all();
  return rows.map((r) => ({
    sourceType: 'SERVICE_JOB' as const,
    id: r.id,
    organizationId: r.organizationId,
    merchantName: r.organization?.name ?? 'Provider',
    createdAt: r.createdAt as InstantLike,
    updatedAt: ((r as { updatedAt?: InstantLike }).updatedAt ?? r.createdAt) as InstantLike,
    raw: { status: r.status, description: r.description, serviceId: r.serviceId, quoteId: r.quoteId },
  }));
}

// ─── batched enrichment for one page ──────────────────────────────────────────

type PaymentRow = {
  id: string; status: string; method: string; currency: string; amount: number;
  reference: string | null; retailOrderId: string | null; restaurantOrderId: string | null;
  createdAt: InstantLike;
};
type DeliveryRow = { id: string; sourceType: string | null; sourceId: string | null; status: string; createdAt: InstantLike; updatedAt?: InstantLike };
type Enrichment = {
  paymentBySource: Map<string, PaymentRow>;
  refundByPayment: Map<string, string>;
  deliveryBySource: Map<string, DeliveryRow>;
  quoteById: Map<string, { total: number; status: string }>;
  serviceById: Map<string, { name: string; price: number }>;
};

function newestBy<T extends { createdAt: InstantLike }>(map: Map<string, T>, key: string, row: T) {
  const prev = map.get(key);
  if (!prev || toMs(row.createdAt) > toMs(prev.createdAt)) map.set(key, row);
}

async function enrich(rows: SourceRow[], personId: string): Promise<Enrichment> {
  const retailIds = rows.filter((r) => r.sourceType === 'RETAIL_ORDER').map((r) => r.id);
  const restaurantIds = rows.filter((r) => r.sourceType === 'RESTAURANT_ORDER').map((r) => r.id);
  const orderIds = [...retailIds, ...restaurantIds];
  const serviceRows = rows.filter((r) => r.sourceType === 'SERVICE_JOB');
  const quoteIds = serviceRows.map((r) => r.raw.quoteId).filter((v): v is string => typeof v === 'string');
  const catalogIds = serviceRows.map((r) => r.raw.serviceId).filter((v): v is string => typeof v === 'string');

  const [retailPays, restaurantPays, deliveries, quotes, services] = await Promise.all([
    retailIds.length ? db.orm.public.Payment.where((p) => p.retailOrderId.in(retailIds)).all() : Promise.resolve([]),
    restaurantIds.length ? db.orm.public.Payment.where((p) => p.restaurantOrderId.in(restaurantIds)).all() : Promise.resolve([]),
    orderIds.length ? db.orm.public.DeliveryJob.where((d) => d.sourceId.in(orderIds)).select('id', 'sourceType', 'sourceId', 'status', 'createdAt').all() : Promise.resolve([]),
    quoteIds.length ? db.orm.public.ServiceJobQuote.where((q) => q.id.in(quoteIds)).select('id', 'total', 'status').all() : Promise.resolve([]),
    catalogIds.length ? db.orm.public.ServiceCatalogItem.where((s) => s.id.in(catalogIds)).select('id', 'name', 'price').all() : Promise.resolve([]),
  ]);

  const paymentBySource = new Map<string, PaymentRow>();
  for (const p of [...retailPays, ...restaurantPays] as unknown as PaymentRow[]) {
    if (p.retailOrderId) newestBy(paymentBySource, `RETAIL_ORDER:${p.retailOrderId}`, p);
    if (p.restaurantOrderId) newestBy(paymentBySource, `RESTAURANT_ORDER:${p.restaurantOrderId}`, p);
  }

  // Refund requests are additionally scoped to this resident (defence in depth).
  const paymentIds = [...paymentBySource.values()].map((p) => p.id);
  const refundByPayment = new Map<string, string>();
  if (paymentIds.length) {
    const refunds = await db.orm.public.RefundRequest
      .where((r) => r.paymentId.in(paymentIds))
      .where({ personId })
      .select('paymentId', 'status', 'createdAt')
      .all();
    const newest = new Map<string, { status: string; createdAt: InstantLike }>();
    for (const r of refunds) newestBy(newest, r.paymentId, { status: r.status as string, createdAt: r.createdAt as InstantLike });
    for (const [k, v] of newest) refundByPayment.set(k, v.status);
  }

  const deliveryBySource = new Map<string, DeliveryRow>();
  for (const d of deliveries as unknown as DeliveryRow[]) {
    if (!d.sourceType || !d.sourceId) continue;
    if (d.sourceType !== 'RETAIL_ORDER' && d.sourceType !== 'RESTAURANT_ORDER') continue;
    newestBy(deliveryBySource, `${d.sourceType}:${d.sourceId}`, d);
  }

  return {
    paymentBySource,
    refundByPayment,
    deliveryBySource,
    quoteById: new Map(quotes.map((q) => [q.id, { total: q.total as number, status: q.status as string }])),
    serviceById: new Map(services.map((s) => [s.id, { name: s.name as string, price: s.price as number }])),
  };
}

// ─── normalisation (pure given rows + enrichment) ─────────────────────────────

export function normalize(row: SourceRow, e: Enrichment): ResidentActivityItem {
  const key = `${row.sourceType}:${row.id}`;
  const payment = e.paymentBySource.get(key) ?? null;
  const delivery = e.deliveryBySource.get(key) ?? null;
  const refundRaw = payment ? e.refundByPayment.get(payment.id) : undefined;

  let order: StatusView;
  let title: string;
  let kind: ActivityKind;
  let amount: number | null = null;
  let amountKind: AmountKind = 'none';

  if (row.sourceType === 'RETAIL_ORDER') {
    kind = 'shop';
    title = 'Shop order';
    order = retailOrderStatusView(String(row.raw.status), row.raw.fulfillmentStatus as string | null);
    amount = Number(row.raw.totalAmount);
    amountKind = 'order_total';
  } else if (row.sourceType === 'RESTAURANT_ORDER') {
    kind = 'restaurant';
    title = 'Food order';
    order = restaurantOrderStatusView(String(row.raw.status));
    amount = Number(row.raw.totalAmount);
    amountKind = 'order_total';
  } else {
    kind = 'service';
    const svc = typeof row.raw.serviceId === 'string' ? e.serviceById.get(row.raw.serviceId) : undefined;
    title = svc?.name || (typeof row.raw.description === 'string' && row.raw.description) || 'Service request';
    order = serviceJobStatusView(String(row.raw.status));
    const quote = typeof row.raw.quoteId === 'string' ? e.quoteById.get(row.raw.quoteId) : undefined;
    if (quote) {
      amount = quote.total;
      amountKind = 'quote';
    } else if (svc) {
      amount = svc.price;
      amountKind = 'base_price';
    }
  }

  const paymentView = payment ? paymentStatusView(payment.status) : null;
  const deliveryView = delivery ? deliveryStatusView(delivery.status) : null;

  return {
    key,
    sourceType: row.sourceType,
    sourceId: row.id,
    kind,
    merchantId: row.organizationId,
    merchantName: row.merchantName,
    title,
    amount: Number.isFinite(amount as number) ? amount : null,
    amountKind,
    currency: payment?.currency ?? null,
    order,
    payment: paymentView,
    paymentMethod: payment?.method ?? null,
    refund: refundRaw ? refundRequestStatusView(refundRaw) : null,
    delivery: deliveryView,
    deliveryDelayed: delivery
      ? isDeliveryDelayed(delivery.status, Math.max(toMs(delivery.updatedAt ?? delivery.createdAt), 0), Date.now())
      : false,
    headline: headlineStatus({ order, payment: paymentView, delivery: deliveryView }),
    activityAt: toIso(row.createdAt),
    activityAtMs: toMs(row.createdAt),
    updatedAtMs: toMs(row.updatedAt),
    href: hrefFor(row.sourceType, row.id),
  };
}

// ─── public API ───────────────────────────────────────────────────────────────

export async function composeResidentActivity(
  personId: string,
  opts: { limit?: number; cursor?: string | null } = {},
): Promise<ResidentActivityPage> {
  const limit = clampLimit(opts.limit);
  const before = parseCursor(opts.cursor);
  const customerIds = await resolveResidentCustomerIds(personId);
  if (customerIds.length === 0) return { items: [], nextCursor: null, unavailable: [] };

  // Each source fetches limit+1 so we know whether more exist beyond this page.
  const take = limit + 1;
  const sources: [ActivityKind, Promise<SourceRow[]>][] = [
    ['shop', fetchRetail(customerIds, before, take)],
    ['restaurant', fetchRestaurant(customerIds, before, take)],
    ['service', fetchService(customerIds, before, take)],
  ];
  const settled = await Promise.allSettled(sources.map(([, p]) => p));

  const unavailable: ActivityKind[] = [];
  const all: SourceRow[] = [];
  let anySourceHasMore = false;
  settled.forEach((res, i) => {
    const kind = sources[i][0];
    if (res.status === 'fulfilled') {
      if (res.value.length > limit) anySourceHasMore = true;
      all.push(...res.value);
    } else {
      unavailable.push(kind);
      console.error(`[resident-activity] source '${kind}' failed`, res.reason);
    }
  });

  all.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt) || (a.id < b.id ? 1 : -1));
  const page = all.slice(0, limit);
  const hasMore = anySourceHasMore || all.length > limit;

  const e = await enrich(page, personId);
  const items = page.map((r) => normalize(r, e));

  return {
    items,
    nextCursor: hasMore && items.length > 0 ? items[items.length - 1].activityAt : null,
    unavailable,
  };
}

export type ActivityLine = { name: string; quantity: number; unitPrice: number | null };

export type ResidentActivityDetail = ResidentActivityItem & {
  lines: ActivityLine[];
  paymentReference: string | null;
  orderType: string | null;
  quoteStatus: string | null;
  /** Full resident delivery view (item.delivery stays the feed StatusView). */
  deliveryDetail: ResidentDelivery | null;
};

/**
 * Fetches one activity, proving ownership in the SAME query that loads it
 * (`id = sourceId AND customerDataId IN residentCustomerIds`). Returns null for
 * both "does not exist" and "belongs to someone else" so existence never leaks.
 */
export async function getResidentActivityDetail(
  personId: string,
  sourceType: unknown,
  sourceId: unknown,
): Promise<ResidentActivityDetail | null> {
  if (!isActivitySourceType(sourceType)) return null;
  if (typeof sourceId !== 'string' || sourceId.length === 0 || sourceId.length > 64) return null;

  const customerIds = await resolveResidentCustomerIds(personId);
  if (customerIds.length === 0) return null;

  let row: SourceRow | undefined;
  if (sourceType === 'RETAIL_ORDER') {
    row = (await fetchRetailById(customerIds, sourceId))[0];
  } else if (sourceType === 'RESTAURANT_ORDER') {
    row = (await fetchRestaurantById(customerIds, sourceId))[0];
  } else {
    row = (await fetchServiceById(customerIds, sourceId))[0];
  }
  if (!row) return null;

  const e = await enrich([row], personId);
  const base = normalize(row, e);
  const payment = e.paymentBySource.get(base.key) ?? null;

  let lines: ActivityLine[] = [];
  let quoteStatus: string | null = null;
  if (sourceType === 'RETAIL_ORDER') {
    const items = await db.orm.public.RetailOrderItem.where({ orderId: row.id }).all();
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = productIds.length
      ? await db.orm.public.RetailProduct.where((p) => p.id.in(productIds)).select('id', 'name').all()
      : [];
    const names = new Map(products.map((p) => [p.id, p.name as string]));
    lines = items.map((i) => ({ name: names.get(i.productId) ?? 'Item', quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }));
  } else if (sourceType === 'RESTAURANT_ORDER') {
    const items = await db.orm.public.OrderItem.where({ orderId: row.id }).all();
    const missing = [...new Set(items.filter((i) => !i.menuItemName).map((i) => i.menuItemId))];
    const menu = missing.length
      ? await db.orm.public.MenuItem.where((m) => m.id.in(missing)).select('id', 'name').all()
      : [];
    const names = new Map(menu.map((m) => [m.id, m.name as string]));
    lines = items.map((i) => ({
      name: (i.menuItemName as string | null) ?? names.get(i.menuItemId) ?? 'Item',
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    }));
  } else {
    lines = [{ name: base.title, quantity: 1, unitPrice: base.amount }];
    const quoteId = row.raw.quoteId;
    if (typeof quoteId === 'string') quoteStatus = e.quoteById.get(quoteId)?.status ?? null;
  }

  // Ownership of this order was proven above (same query as the load), so the
  // delivery lookup keyed by that order id is authorised. ServiceOS has no
  // LogisticsOS relationship, so services never get a delivery section.
  const deliveryDetail = sourceType !== 'SERVICE_JOB' ? await loadDeliveryForOwnedSource(sourceType, row.id) : null;

  return {
    ...base,
    lines,
    paymentReference: payment?.reference ?? null,
    orderType: typeof row.raw.type === 'string' ? row.raw.type : null,
    quoteStatus,
    deliveryDetail,
  };
}

/**
 * True only if `sourceId` is an order of `sourceType` owned by this resident.
 * Single scoped query (`id AND customerDataId IN residentCustomerIds`).
 */
export async function ownsOrderSource(personId: string, sourceType: unknown, sourceId: unknown): Promise<boolean> {
  if (sourceType !== 'RETAIL_ORDER' && sourceType !== 'RESTAURANT_ORDER') return false;
  if (typeof sourceId !== 'string' || sourceId.length === 0 || sourceId.length > 64) return false;
  const customerIds = await resolveResidentCustomerIds(personId);
  if (customerIds.length === 0) return false;
  const rows = sourceType === 'RETAIL_ORDER'
    ? await fetchRetailById(customerIds, sourceId)
    : await fetchRestaurantById(customerIds, sourceId);
  return rows.length > 0;
}

async function fetchRetailById(customerIds: string[], id: string) {
  const rows = await db.orm.public.RetailOrder
    .where({ id })
    .where((o) => o.customerDataId.in(customerIds))
    .include('organization', (org) => org.select('name'))
    .all();
  return rows.map((r) => ({
    sourceType: 'RETAIL_ORDER' as const, id: r.id, organizationId: r.organizationId,
    merchantName: r.organization?.name ?? 'Merchant',
    createdAt: r.createdAt as InstantLike,
    updatedAt: ((r as { updatedAt?: InstantLike }).updatedAt ?? r.createdAt) as InstantLike,
    raw: { status: r.status, fulfillmentStatus: r.fulfillmentStatus, totalAmount: r.totalAmount },
  }));
}

async function fetchRestaurantById(customerIds: string[], id: string) {
  const rows = await db.orm.public.RestaurantOrder
    .where({ id })
    .where((o) => o.customerDataId.in(customerIds))
    .include('organization', (org) => org.select('name'))
    .all();
  return rows.map((r) => ({
    sourceType: 'RESTAURANT_ORDER' as const, id: r.id, organizationId: r.organizationId,
    merchantName: r.organization?.name ?? 'Restaurant',
    createdAt: r.createdAt as InstantLike, updatedAt: ((r as { updatedAt?: InstantLike }).updatedAt ?? r.createdAt) as InstantLike,
    raw: { status: r.status, type: r.type, totalAmount: r.totalAmount },
  }));
}

async function fetchServiceById(customerIds: string[], id: string) {
  const rows = await db.orm.public.ServiceJob
    .where({ id })
    .where((j) => j.customerDataId.in(customerIds))
    .include('organization', (org) => org.select('name'))
    .all();
  return rows.map((r) => ({
    sourceType: 'SERVICE_JOB' as const, id: r.id, organizationId: r.organizationId,
    merchantName: r.organization?.name ?? 'Provider',
    createdAt: r.createdAt as InstantLike, updatedAt: ((r as { updatedAt?: InstantLike }).updatedAt ?? r.createdAt) as InstantLike,
    raw: { status: r.status, description: r.description, serviceId: r.serviceId, quoteId: r.quoteId },
  }));
}
