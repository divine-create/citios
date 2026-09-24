import sys

res = 'lib/actions/restaurantos.ts'
with open(res, 'r', encoding='utf-8') as f:
    rc = f.read()

# 1. Fix variant selection capability check
variant_orig = """if (item.variantId) {
            const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
            if (variant) {
              unitPrice = variant.price;
              variantName = variant.name;
            }
          }"""
variant_patch = """if (item.variantId) {
            if (!settings?.enableVariants) return { error: 'Variants are disabled for this organization.' };
            const variant = await db.orm.public.MenuItemVariant.where({ id: item.variantId, menuItemId: menuItem.id }).all().first();
            if (!variant || !variant.isAvailable) return { error: 'Invalid or inactive variant selected.' };
            unitPrice = variant.price;
            variantName = variant.name;
          }"""
rc = rc.replace(variant_orig, variant_patch)

# 2. Fix duplicate settings declaration in createPosOrder
bad_settings_block = """// Settings: tax, service charge, next call-out number.
    const settings = await db.orm.public.RestaurantSettings.where({ organizationId: input.organizationId }).all().first();"""

rc = rc.replace(bad_settings_block, "// Settings: tax, service charge, next call-out number. (moved up)")

with open(res, 'w', encoding='utf-8') as f:
    f.write(rc)
print("Fixed duplicate settings and variant patch!")
