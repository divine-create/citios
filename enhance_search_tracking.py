import os

f = 'app/actions/explore.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

search_code = """
  const resultCount = filteredOrgs.length + products.length;
  if (q) {
    trackEvent({
      eventType: 'SEARCH_PERFORMED',
      metadata: { query: q, resultCount, zeroResult: resultCount === 0 },
      locationId: city?.id,
      entityType: 'SearchQuery'
    });
  }
"""

replacement = """
  const resultCount = filteredOrgs.length + products.length;
  if (q) {
    trackEvent({
      eventType: 'SEARCH_PERFORMED',
      metadata: { 
        query: q, 
        resultCount, 
        zeroResult: resultCount === 0,
        searchContext: 'explore'
      },
      locationId: city?.id,
      vertical: cat !== 'All' ? cat : null,
      entityType: 'SearchQuery'
    });
  }
"""

c = c.replace(search_code.strip(), replacement.strip())

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)
