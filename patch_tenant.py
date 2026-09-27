import os

f = 'lib/actions/tenant.ts'
with open(f, 'r', encoding='utf-8') as file:
    c = file.read()

# find where it fetches membership and add organization status check
insert_idx = c.find('const membership = await db.orm.public.Membership.where({')

if insert_idx != -1:
    new_check = """
  const org = await db.orm.public.Organization.where({ id: organizationId }).all().first();
  if (org && org.status === 'SUSPENDED') {
    throw new Error('FORBIDDEN: Organization has been suspended by the platform.');
  }

"""
    c = c[:insert_idx] + new_check + c[insert_idx:]
    with open(f, 'w', encoding='utf-8') as file:
        file.write(c)
    print("Modified tenant.ts")
else:
    print("Could not find insertion point")
