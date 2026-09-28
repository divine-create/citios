import { db } from '@/src/prisma/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Valid event types based on CityOS architecture
 */
export type AnalyticsEventType = 
  | 'SEARCH_PERFORMED' 
  | 'SEARCH_RESULT_SELECTED'
  | 'PRODUCT_VIEWED'
  | 'BUSINESS_VIEWED'
  | 'SERVICE_VIEWED'
  | 'RESTAURANT_VIEWED'
  | 'SHOP_VIEWED'
  | 'HOTEL_VIEWED'
  | 'SCHOOL_VIEWED'
  | 'ITEM_SAVED'
  | 'ITEM_UNSAVED'
  | 'ORDER_CREATED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'BOOKING_CREATED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCELLED'
  | 'SERVICE_REQUEST_CREATED'
  | 'SERVICE_REQUEST_COMPLETED'
  | 'REVIEW_CREATED';

interface TrackEventParams {
  eventType: AnalyticsEventType;
  personId?: string | null;
  organizationId?: string | null;
  locationId?: string | null;
  vertical?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: any;
}

/**
 * Server-side event tracking. Always explicitly associate with current session identity if personId is omitted.
 */
export async function trackEvent(params: TrackEventParams) {
  try {
    let finalPersonId = params.personId;

    // Default to the current authenticated user if not explicitly provided
    if (finalPersonId === undefined) {
      const session = await getServerSession(authOptions);
      finalPersonId = (session?.user as any)?.personId || null;
    }

    await db.orm.public.MeasurementEvent.create({
      eventType: params.eventType,
      personId: finalPersonId,
      organizationId: params.organizationId || null,
      locationId: params.locationId || null,
      vertical: params.vertical || null,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (error) {
    // Non-blocking error logging
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * HQ Platform Analytics Methods
 */
export async function getPlatformAnalytics(timeWindowDays = 30) {
  const since = new Date();
  since.setDate(since.getDate() - timeWindowDays);

  // Use database aggregates wherever possible (No N+1, no .slice())
  
  // 1. Users
  const totalUsers = await db.orm.public.Person.all().then(r => r.length);
  const newUsers = await db.orm.public.Person.where((p) => p.createdAt.gt(since)).all().then(r => r.length);

  // 2. Organizations
  const totalOrgs = await db.orm.public.Organization.all().then(r => r.length);
  const newOrgs = await db.orm.public.Organization.where((o) => o.createdAt.gt(since)).all().then(r => r.length);

  // 3. Retail Orders (ShopOS)
  const retailOrdersAgg = await db.orm.public.RetailOrder.where((o) => o.createdAt.gt(since)).aggregate((a) => ({ count: a.count() }));
  
  // 4. Restaurant Orders (RestaurantOS)
  const restaurantOrdersAgg = await db.orm.public.RestaurantOrder.where((o) => o.createdAt.gt(since)).aggregate((a) => ({ count: a.count() }));
  
  // 5. Total Searches
  const searchesAgg = await db.orm.public.MeasurementEvent
    .where((e: any) => e.eventType.eq('SEARCH_PERFORMED').and(e.occurredAt.gt(since)))
    .aggregate((a) => ({ count: a.count() }));

  // 6. Payments
  const paymentsAgg = await db.orm.public.Payment
    .where((p) => p.createdAt.gt(since))
    .aggregate((a) => ({ count: a.count(), volume: a.sum('amount') }));
    
  return {
    users: {
      total: totalUsers,
      recent: newUsers
    },
    organizations: {
      total: totalOrgs,
      recent: newOrgs
    },
    orders: {
      retailRecent: Number(retailOrdersAgg.count),
      restaurantRecent: Number(restaurantOrdersAgg.count),
    },
    activity: {
      recentSearches: Number(searchesAgg.count)
    },
    financial: {
      recentPaymentCount: Number(paymentsAgg.count),
      recentPaymentVolume: Number(paymentsAgg.volume || 0)
    }
  };
}

/**
 * Search Intelligence
 */
export async function getSearchIntelligence(timeWindowDays = 30) {
  const since = new Date();
  since.setDate(since.getDate() - timeWindowDays);

  const today = new Date();
  today.setDate(today.getDate() - 1);

  const searchEvents = await db.orm.public.MeasurementEvent
    .where((e: any) => e.eventType.eq('SEARCH_PERFORMED').and(e.occurredAt.gt(since)))
    .limit(2000)
    .all();

  const totalSearches = searchEvents.length;
  let searchesToday = 0;
  let zeroResultSearches = 0;
  
  const uniqueSearchers = new Set<string>();
  
  // query -> { count, totalResults, zeroCount }
  const queryStats: Record<string, { count: number, totalResults: number, zeroCount: number }> = {};
  
  // vertical -> count
  const verticalStats: Record<string, number> = {};
  const locationStats: Record<string, { count: number, zeroCount: number }> = {};

  searchEvents.forEach(e => {
    try {
      if (e.personId) uniqueSearchers.add(e.personId);
      if (e.occurredAt > today) searchesToday++;
      
      const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : (e.metadata || {});
      const q = meta.query ? String(meta.query).toLowerCase().trim() : null;
      const resCount = typeof meta.resultCount === 'number' ? meta.resultCount : 0;
      const isZero = resCount === 0;
      
      if (isZero) zeroResultSearches++;
      
      if (e.vertical) {
        verticalStats[e.vertical] = (verticalStats[e.vertical] || 0) + 1;
      }
      if (e.locationId) {
        if (!locationStats[e.locationId]) locationStats[e.locationId] = { count: 0, zeroCount: 0 };
        locationStats[e.locationId].count++;
        if (isZero) locationStats[e.locationId].zeroCount++;
      }

      if (q) {
        if (!queryStats[q]) {
          queryStats[q] = { count: 0, totalResults: 0, zeroCount: 0 };
        }
        queryStats[q].count++;
        queryStats[q].totalResults += resCount;
        if (isZero) queryStats[q].zeroCount++;
      }
    } catch (err) {}
  });

  const popular = Object.entries(queryStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([query, stats]) => ({ 
      query, 
      count: stats.count,
      avgResults: Math.round(stats.totalResults / stats.count),
      zeroCount: stats.zeroCount,
      zeroRate: Math.round((stats.zeroCount / stats.count) * 100)
    }));
    
  const demandGaps = Object.entries(queryStats)
    .filter(([_, stats]) => stats.zeroCount > 0)
    .sort((a, b) => b[1].zeroCount - a[1].zeroCount)
    .slice(0, 10)
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      zeroRate: Math.round((stats.zeroCount / stats.count) * 100)
    }));

  const byVertical = Object.entries(verticalStats)
    .sort((a, b) => b[1] - a[1])
    .map(([vertical, count]) => ({ vertical, count }));

  const byLocation = Object.entries(locationStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([locationId, stats]) => ({
      locationId,
      count: stats.count,
      zeroRate: Math.round((stats.zeroCount / stats.count) * 100)
    }));

  return {
    totalSearches,
    uniqueSearchers: uniqueSearchers.size,
    searchesToday,
    zeroResultSearches,
    topSearches: popular,
    demandGaps,
    byVertical,
    byLocation
  };
}