import os

f = 'lib/actions/analytics.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

c = c.replace("import { getAuthSession } from '@/lib/auth';", "import { getServerSession } from 'next-auth';\nimport { authOptions } from '@/lib/auth';")
c = c.replace("const session = await getAuthSession();", "const session = await getServerSession(authOptions);")
c = c.replace("finalPersonId = session?.user?.id || null;", "finalPersonId = (session?.user as any)?.personId || null;")

# Fix where for equals
c = c.replace(".where((e) => e.eventType.equals('SEARCH_PERFORMED').and(e.occurredAt.gt(since)))",
              ".where((e: any) => e.eventType.eq('SEARCH_PERFORMED').and(e.occurredAt.gt(since)))")

with open(f, 'w', encoding='utf-8') as file:
    file.write(c)

f2 = 'app/actions/explore.ts'
with open(f2, 'r', encoding='utf-8') as file:
    c2 = file.read()

# I wrote `if (q) trackEvent(...)` before `q` was declared!
c2 = c2.replace("if (q) trackEvent({ eventType: 'SEARCH_PERFORMED', metadata: { query: q, resultCount: 0, zeroResult: true }, locationId: city.id, entityType: 'SearchQuery' });\n  return { organizations: [], products: [] };",
                "return { organizations: [], products: [] };")

c2 = c2.replace("locationId: city.id,", "locationId: city?.id,")

with open(f2, 'w', encoding='utf-8') as file:
    file.write(c2)

