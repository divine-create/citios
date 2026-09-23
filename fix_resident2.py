import sys

with open('lib/actions/resident.ts', 'r', encoding='utf-8') as f:
    c = f.read()

bad2 = '''export async function getHotelRooms(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      locs = locs.filter(l => l.cityId === activeCity.id);
      if (locs.length === 0) return [];
    }
    const items = await db.orm.public.HotelRoom.where({ organizationId: orgId }).all();
    return JSON.parse(JSON.stringify(items));
}'''

good2 = '''export async function getHotelRooms(orgId: string) {
    const activeCity = await getCurrentCity();
    let locs = await db.orm.public.Location.where({ organizationId: orgId }).all();
    if (activeCity) {
      const cityLocs = locs.filter(l => l.cityId === activeCity.id);
      if (cityLocs.length > 0) locs = cityLocs;
    }
    const validLocIds = new Set(locs.map(l => l.id));
    let items = await db.orm.public.HotelRoom.where({ organizationId: orgId }).all();
    items = items.filter(i => validLocIds.has(i.locationId));
    return JSON.parse(JSON.stringify(items));
}'''

c = c.replace(bad2, good2)

with open('lib/actions/resident.ts', 'w', encoding='utf-8') as f:
    f.write(c)
