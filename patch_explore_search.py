import os
f = 'app/actions/explore.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("import { getCurrentCity, getCityBySlug } from '@/lib/city';",
              "import { getCurrentCity, getCityBySlug } from '@/lib/city';\nimport { trackEvent } from '@/lib/actions/analytics';")

c = c.replace("return { organizations: [], products: [] };", "if (q) trackEvent({ eventType: 'SEARCH_PERFORMED', metadata: { query: q, resultCount: 0, zeroResult: true }, locationId: city.id, entityType: 'SearchQuery' });\n  return { organizations: [], products: [] };")

search_end = """
  return {
    organizations: filteredOrgs,
    products: products
  };
"""
search_end_replacement = """
  const resultCount = filteredOrgs.length + products.length;
  if (q) {
    trackEvent({
      eventType: 'SEARCH_PERFORMED',
      metadata: { query: q, resultCount, zeroResult: resultCount === 0 },
      locationId: city.id,
      entityType: 'SearchQuery'
    });
  }
  return {
    organizations: filteredOrgs,
    products: products
  };
"""

c = c.replace(search_end.strip(), search_end_replacement.strip())

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

