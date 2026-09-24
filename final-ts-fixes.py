import sys
import re

# 1. Fix overview/page.tsx
overview = 'app/(resident)/workspaces/restaurantos/[slug]/management/overview/page.tsx'
with open(overview, 'r', encoding='utf-8') as f:
    oc = f.read()
oc = oc.replace("getRecentOrders(slug, 50)", "getRecentOrders(slug, { limit: 50 })")
with open(overview, 'w', encoding='utf-8') as f:
    f.write(oc)


# 2. Fix CostingDashboard.tsx (type any on array callbacks)
costing = 'components/restaurantos/management/CostingDashboard.tsx'
with open(costing, 'r', encoding='utf-8') as f:
    cc = f.read()
cc = cc.replace(".filter(m => m.costState", ".filter((m: any) => m.costState")
cc = cc.replace(".reduce((s, m) => s + m.costPercent", ".reduce((s: number, m: any) => s + m.costPercent")
with open(costing, 'w', encoding='utf-8') as f:
    f.write(cc)


# 3. Fix MenuManager.tsx
menu = 'components/restaurantos/management/MenuManager.tsx'
with open(menu, 'r', encoding='utf-8') as f:
    mc = f.read()
mc = mc.replace("await toggleMenuItemAvailability(item.id);", "await toggleMenuItemAvailability(id);")
with open(menu, 'w', encoding='utf-8') as f:
    f.write(mc)


# 4. Fix lib/actions/restaurantos.ts (duplicate settings)
res = 'lib/actions/restaurantos.ts'
with open(res, 'r', encoding='utf-8') as f:
    rc = f.read()

# There is a block:
#      // Settings: tax, service charge, next call-out number.
#      const settings = await db.orm.public.RestaurantSettings
#        .where({ organizationId: input.organizationId })
#        .all()
#        .first();
regex = r'const settings = await db\.orm\.public\.RestaurantSettings\s*\.where\(\{ organizationId: input\.organizationId \}\)\s*\.all\(\)\s*\.first\(\);'
rc = re.sub(regex, "/* settings removed */", rc)

with open(res, 'w', encoding='utf-8') as f:
    f.write(rc)
print("Applied final strict TS fixes!")
