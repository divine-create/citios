import os
import re

f = 'lib/actions/analytics.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

# Add locationStats
c = c.replace("const verticalStats: Record<string, number> = {};", "const verticalStats: Record<string, number> = {};\n  const locationStats: Record<string, { count: number, zeroCount: number }> = {};")

c = c.replace("""      if (e.vertical) {
        verticalStats[e.vertical] = (verticalStats[e.vertical] || 0) + 1;
      }""", """      if (e.vertical) {
        verticalStats[e.vertical] = (verticalStats[e.vertical] || 0) + 1;
      }
      if (e.locationId) {
        if (!locationStats[e.locationId]) locationStats[e.locationId] = { count: 0, zeroCount: 0 };
        locationStats[e.locationId].count++;
        if (isZero) locationStats[e.locationId].zeroCount++;
      }""")

c = c.replace("""  const byVertical = Object.entries(verticalStats)
    .sort((a, b) => b[1] - a[1])
    .map(([vertical, count]) => ({ vertical, count }));""", """  const byVertical = Object.entries(verticalStats)
    .sort((a, b) => b[1] - a[1])
    .map(([vertical, count]) => ({ vertical, count }));

  const byLocation = Object.entries(locationStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([locationId, stats]) => ({
      locationId,
      count: stats.count,
      zeroRate: Math.round((stats.zeroCount / stats.count) * 100)
    }));""")

c = c.replace("byVertical\n  };", "byVertical,\n    byLocation\n  };")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

