/**
 * Resident Logistics — read layer over LogisticsOS (DeliveryJob / DeliveryTrackingEvent).
 *
 * NOT a 'use server' module: `loadDeliveryForOwnedSource` trusts that the caller
 * has already proven the resident owns the source order. Use `getResidentDelivery`
 * (./index.ts), which performs that ownership proof first.
 *
 * Strictly read-only. Exposes the minimum necessary to the resident: status,
 * their own drop-off address, milestone timeline and tracking freshness. It does
 * NOT expose rider identity, pickup/merchant coordinates, dispatch data or notes.
 */
import { db } from '@/src/prisma/db';
import {
  type ResidentDeliveryStatus,
  residentDeliveryStatus,
  isActiveDelivery,
  isDeliveryDelayed,
  isTimelineEvent,
  TIMELINE_EVENT_TYPES,
  LOCATION_FRESH_MINUTES,
} from './status';

export type DeliverySource = 'RETAIL_ORDER' | 'RESTAURANT_ORDER';

export type ResidentDeliveryEvent = { status: ResidentDeliveryStatus; atMs: number };

export type ResidentDelivery = {
  deliveryId: string;
  status: ResidentDeliveryStatus;
  dropoffAddress: string | null;
  active: boolean;
  /** Presentation hint: record has had no update for longer than expected. */
  delayed: boolean;
  /** Only milestones that actually exist; never fabricated. */
  timeline: ResidentDeliveryEvent[];
  tracking: {
    /** Latest authoritative LOCATION_UPDATE timestamp, or null if LogisticsOS has none. */
    lastLocationAtMs: number | null;
    fresh: boolean;
  };
  createdAtMs: number;
  updatedAtMs: number;
};

type InstantLike = { epochMilliseconds: number } | string | Date | null | undefined;

function toMs(v: InstantLike): number {
  if (!v) return 0;
  if (typeof v === 'string') return new Date(v).getTime();
  if (v instanceof Date) return v.getTime();
  return v.epochMilliseconds;
}

export const MAX_TIMELINE_EVENTS = 50;

export async function loadDeliveryForOwnedSource(
  sourceType: DeliverySource,
  sourceId: string,
  nowMs: number = Date.now(),
): Promise<ResidentDelivery | null> {
  const jobs = await db.orm.public.DeliveryJob
    .where({ sourceType, sourceId })
    .orderBy((j) => j.createdAt.desc())
    .limit(1)
    .all();
  const job = jobs[0];
  if (!job) return null;

  // Two bounded queries: milestones (capped) and the single latest GPS ping.
  const [events, locations] = await Promise.all([
    db.orm.public.DeliveryTrackingEvent
      .where((e) => e.deliveryJobId.eq(job.id))
      .where((e) => e.eventType.in([...TIMELINE_EVENT_TYPES]))
      .orderBy((e) => e.recordedAt.desc())
      .limit(MAX_TIMELINE_EVENTS)
      .select('eventType', 'recordedAt')
      .all(),
    db.orm.public.DeliveryTrackingEvent
      .where({ deliveryJobId: job.id, eventType: 'LOCATION_UPDATE' })
      .orderBy((e) => e.recordedAt.desc())
      .limit(1)
      .select('recordedAt')
      .all(),
  ]);

  const timeline = events
    .filter((e) => isTimelineEvent(String(e.eventType)))
    .map((e) => ({ status: residentDeliveryStatus(String(e.eventType)), atMs: toMs(e.recordedAt as InstantLike) }))
    .sort((a, b) => a.atMs - b.atMs);

  const lastLocationAtMs = locations[0] ? toMs(locations[0].recordedAt as InstantLike) : null;
  const status = residentDeliveryStatus(String(job.status));
  const updatedAtMs = toMs(((job as any).updatedAt ?? job.createdAt) as InstantLike);
  const lastActivityMs = Math.max(updatedAtMs, timeline.length ? timeline[timeline.length - 1].atMs : 0);

  return {
    deliveryId: job.id,
    status,
    dropoffAddress: job.dropoffAddress ?? null,
    active: isActiveDelivery(String(job.status)),
    delayed: isDeliveryDelayed(String(job.status), lastActivityMs, nowMs),
    timeline,
    tracking: {
      lastLocationAtMs,
      fresh: lastLocationAtMs !== null && (nowMs - lastLocationAtMs) / 60000 <= LOCATION_FRESH_MINUTES,
    },
    createdAtMs: toMs(job.createdAt as InstantLike),
    updatedAtMs,
  };
}
