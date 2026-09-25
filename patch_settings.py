import sys

with open('lib/actions/restaurantos.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''export async function getRestaurantOSSettings(organizationId: string) {'''

replacement = '''export async function updateRestaurantSettings(organizationId: string, data: any) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    
    // Convert string booleans/numbers if needed, but we'll assume correct types are sent
    const existing = await db.orm.public.RestaurantSettings.where({ organizationId }).all().first();
    
    if (existing) {
      await db.orm.public.RestaurantSettings.where({ organizationId }).update(data);
    } else {
      await db.orm.public.RestaurantSettings.create({
        organizationId,
        ...data
      });
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return { error: error.message };
  }
}

export async function getRestaurantOSSettings(organizationId: string) {'''

content = content.replace(target, replacement)

with open('lib/actions/restaurantos.ts', 'w', encoding='utf-8') as f:
    f.write(content)
