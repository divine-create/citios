import os
import re

f = 'lib/actions/analytics.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

new_func = """
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

  return {
    totalSearches,
    uniqueSearchers: uniqueSearchers.size,
    searchesToday,
    zeroResultSearches,
    topSearches: popular,
    demandGaps,
    byVertical
  };
}
"""

c = re.sub(r'export async function getSearchIntelligence.*', new_func.strip(), c, flags=re.DOTALL)

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

