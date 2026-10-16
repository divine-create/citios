/**
 * Canonical Registry of City Areas / Neighborhood Districts for CityOS.
 * Used for localized delivery scoping, merchant branch binding, and customer storefront filtering.
 */

export interface CityArea {
  id: string; // unique slug e.g. 'marian-road'
  name: string; // e.g. 'Marian Road & Environs'
  shortName: string; // e.g. 'Marian'
  description?: string;
  isPopular?: boolean;
}

export const CANONICAL_CITY_AREAS: Record<string, CityArea[]> = {
  calabar: [
    {
      id: 'marian-road',
      name: 'Marian Road & Environs',
      shortName: 'Marian Road',
      description: 'Ndidem Usang Iso axis, fast casual, grills & bakeries',
      isPopular: true,
    },
    {
      id: 'state-housing',
      name: 'State Housing Estate',
      shortName: 'State Housing',
      description: 'Upscale residential, boutique cafes & continental dining',
      isPopular: true,
    },
    {
      id: 'federal-housing',
      name: 'Federal Housing & Ikot Ansa',
      shortName: 'Federal Housing',
      description: '8 Miles & Ikot Ansa highway corridor, family spots & lounges',
      isPopular: true,
    },
    {
      id: 'calabar-south',
      name: 'Calabar South & Watt Market',
      shortName: 'Calabar South',
      description: 'Watt Market, Target, Goldie, native Calabar bukka kitchens',
      isPopular: true,
    },
    {
      id: 'parliamentary',
      name: 'Parliamentary & Asari Eso',
      shortName: 'Parliamentary',
      description: 'Parliamentary extension, municipal offices & executive dining',
      isPopular: true,
    },
    {
      id: 'unical-campus',
      name: 'University of Calabar (Unical Campus)',
      shortName: 'Unical Campus',
      description: 'Main Gate, Malabor corridor, student quick bites & fast food',
      isPopular: true,
    },
    {
      id: 'etta-agbor',
      name: 'Etta Agbor & Mary Slessor',
      shortName: 'Etta Agbor',
      description: 'Student living corridor, shawarma spots & night eats',
      isPopular: false,
    },
    {
      id: 'diamond-hill',
      name: 'Diamond Hill, Marina & Harbor',
      shortName: 'Diamond Hill',
      description: 'Government House axis, waterfront dining & scenic lounges',
      isPopular: false,
    },
  ],
  lagos: [
    { id: 'victoria-island', name: 'Victoria Island & Oniru', shortName: 'VI', isPopular: true },
    { id: 'lekki-phase-1', name: 'Lekki Phase 1 & Admiralty', shortName: 'Lekki 1', isPopular: true },
    { id: 'ikeja-gra', name: 'Ikeja GRA & Allen', shortName: 'Ikeja GRA', isPopular: true },
    { id: 'yaba', name: 'Yaba & Akoka', shortName: 'Yaba', isPopular: true },
    { id: 'surulere', name: 'Surulere & Adeniran Ogunsanya', shortName: 'Surulere', isPopular: true },
  ],
  abuja: [
    { id: 'wuse-2', name: 'Wuse 2 & Aminu Kano', shortName: 'Wuse 2', isPopular: true },
    { id: 'maitama', name: 'Maitama & Gana', shortName: 'Maitama', isPopular: true },
    { id: 'garki', name: 'Garki 1 & 2', shortName: 'Garki', isPopular: true },
    { id: 'jabi', name: 'Jabi & Utako', shortName: 'Jabi', isPopular: true },
  ],
  uyo: [
    { id: 'oron-road', name: 'Oron Road & Environs', shortName: 'Oron Road', isPopular: true },
    { id: 'edet-akpan', name: 'Edet Akpan (Four Lanes)', shortName: '4 Lanes', isPopular: true },
    { id: 'shelter-afrique', name: 'Shelter Afrique Estate', shortName: 'Shelter', isPopular: true },
  ],
};

const DEFAULT_FALLBACK_AREAS: CityArea[] = [
  { id: 'central', name: 'Central Commercial Area', shortName: 'Central', isPopular: true },
  { id: 'north', name: 'North District', shortName: 'North', isPopular: false },
  { id: 'south', name: 'South District', shortName: 'South', isPopular: false },
];

/**
 * Get the list of canonical areas for a city.
 */
export function getCityAreas(citySlug?: string | null): CityArea[] {
  if (!citySlug) return CANONICAL_CITY_AREAS['calabar'];
  const clean = citySlug.trim().toLowerCase();
  return CANONICAL_CITY_AREAS[clean] || CANONICAL_CITY_AREAS['calabar'] || DEFAULT_FALLBACK_AREAS;
}

/**
 * Find an area by id/slug.
 */
export function getAreaBySlug(citySlug: string | null | undefined, areaSlug: string | null | undefined): CityArea | null {
  if (!areaSlug || areaSlug === 'all') return null;
  const areas = getCityAreas(citySlug);
  return areas.find((a) => a.id === areaSlug.toLowerCase()) || null;
}

/**
 * Robust heuristics to detect the area from an address or location name
 * so legacy data automatically benefits from area scoping without manual DB updates.
 */
export function detectAreaFromAddress(citySlug: string | null | undefined, text?: string | null): CityArea | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const areas = getCityAreas(citySlug);

  // Exact ID or name match first
  for (const a of areas) {
    if (t === a.id || t === a.name.toLowerCase() || t === a.shortName.toLowerCase()) {
      return a;
    }
  }

  // Calabar specific keyword matching
  if (t.includes('marian') || t.includes('ndidem usang iso') || t.includes('lion bank') || t.includes('apex')) {
    return areas.find((a) => a.id === 'marian-road') || null;
  }
  if (t.includes('state housing') || t.includes('highway') && t.includes('housing')) {
    return areas.find((a) => a.id === 'state-housing') || null;
  }
  if (t.includes('federal housing') || t.includes('ikot ansa') || t.includes('8 miles') || t.includes('eight miles') || t.includes('murtala mohammed highway')) {
    return areas.find((a) => a.id === 'federal-housing') || null;
  }
  if (t.includes('watt') || t.includes('calabar south') || t.includes('target') || t.includes('goldie') || t.includes('anantigha') || t.includes('chamley') || t.includes('bedwell')) {
    return areas.find((a) => a.id === 'calabar-south') || null;
  }
  if (t.includes('parliamentary') || t.includes('asari eso') || t.includes('municipal')) {
    return areas.find((a) => a.id === 'parliamentary') || null;
  }
  if (t.includes('unical') || t.includes('university of calabar') || t.includes('malabor') || t.includes('campus')) {
    return areas.find((a) => a.id === 'unical-campus') || null;
  }
  if (t.includes('etta agbor') || t.includes('slessor') || t.includes('mary slessor')) {
    return areas.find((a) => a.id === 'etta-agbor') || null;
  }
  if (t.includes('diamond hill') || t.includes('marina') || t.includes('harbor') || t.includes('harbour') || t.includes('epz') || t.includes('government house')) {
    return areas.find((a) => a.id === 'diamond-hill') || null;
  }

  // Generic fallback: check if any short name is contained
  for (const a of areas) {
    if (t.includes(a.shortName.toLowerCase())) {
      return a;
    }
  }

  return null;
}
