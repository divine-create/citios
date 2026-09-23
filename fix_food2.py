import sys

with open('app/actions/food.ts', 'r', encoding='utf-8') as f:
    c = f.read()

bad = '''    // Verify org exists
    const org = await db.orm.public.Organization.where({ id: orgId }).all().first();
    if (!org) throw new Error(Organization not found: );'''

good = '''    // Verify org exists
    const org = await db.orm.public.Organization.where({ id: orgId }).all().first();
    if (!org) throw new Error(Organization not found: );

    // Verify location belongs to organization
    const location = await db.orm.public.Location.where({ id: input.locationId, organizationId: orgId }).all().first();
    if (!location) throw new Error(Location not found or does not belong to this organization);'''

c = c.replace(bad, good)

bad2 = '''        const created = await tx.orm.public.RestaurantOrder.create({
          organizationId: orgId,
          customerDataId: customer.id,'''

good2 = '''        const created = await tx.orm.public.RestaurantOrder.create({
          organizationId: orgId,
          locationId: input.locationId,
          customerDataId: customer.id,'''

c = c.replace(bad2, good2)

with open('app/actions/food.ts', 'w', encoding='utf-8') as f:
    f.write(c)
