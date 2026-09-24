import sys
import re

res = 'lib/actions/restaurantos.ts'
with open(res, 'r', encoding='utf-8') as f:
    rc = f.read()

rc = rc.replace("/* settings removed */", "const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();")

# Now just remove the specific duplicate in createPosOrder
# It occurs right after `// Settings: tax, service charge, next call-out number.` 
bad_settings_block = """// Settings: tax, service charge, next call-out number.
      const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();"""

rc = rc.replace(bad_settings_block, "// Settings: tax, service charge, next call-out number. (moved up)")

with open(res, 'w', encoding='utf-8') as f:
    f.write(rc)
print("Restored removed settings variables and removed only the duplicate!")
