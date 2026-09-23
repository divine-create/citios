import sys
import re

with open('lib/actions/resident.ts', 'r', encoding='utf-8') as f:
    c = f.read()

bad1 = '''export async function getRestaurantMenu(orgId: string) {
    const items = await db.orm.public.MenuItem.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}'''

good1 = '''export async function getRestaurantMenu(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      locs = locs.filter(l => l.cityId === activeCity.id);
      if (locs.length === 0) return [];
    }
    const items = await db.orm.public.MenuItem.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}'''

bad2 = '''export async function getHotelRooms(orgId: string) {
    const items = await db.orm.public.HotelRoom.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}'''

good2 = '''export async function getHotelRooms(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      locs = locs.filter(l => l.cityId === activeCity.id);
      if (locs.length === 0) return [];
    }
    const items = await db.orm.public.HotelRoom.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}'''

bad3 = '''export async function getPharmacyItems(orgId: string) {
    const items = await db.orm.public.PharmacyItem.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}'''

good3 = '''export async function getPharmacyItems(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      locs = locs.filter(l => l.cityId === activeCity.id);
      if (locs.length === 0) return [];
    }
    const items = await db.orm.public.PharmacyItem.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}'''

c = c.replace(bad1, good1).replace(bad2, good2).replace(bad3, good3)

with open('lib/actions/resident.ts', 'w', encoding='utf-8') as f:
    f.write(c)
