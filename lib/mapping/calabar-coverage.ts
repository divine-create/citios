import type {
  AdministrativeLGA,
  AdministrativeLGAId,
  CalabarLandmarkEntry,
  GeoBoundingBox,
  OperationalDeliveryZone,
} from './types';

/**
 * Authoritative Calabar Geographic Metadata
 */
export const CALABAR_CITY_METADATA = {
  slug: 'calabar',
  name: 'Calabar',
  country: 'Nigeria',
  state: 'Cross River',
  timezone: 'Africa/Lagos',
  currency: 'NGN',
  center: { latitude: 4.9757, longitude: 8.3417 },
};

/**
 * Coarse Sanity Bounding Box for the Greater Calabar Urban Envelope.
 * Used ONLY as a preliminary fast-reject check. A coordinate falling within this
 * box is NOT automatically serviceable; it must also reside within an active operational zone.
 */
export const CALABAR_COARSE_BOUNDING_BOX: GeoBoundingBox = {
  minLat: 4.8500,
  maxLat: 5.1500,
  minLng: 8.2500,
  maxLng: 8.4500,
};

/**
 * Administrative Local Government Areas (LGAs) within Calabar.
 * Subordinate to the single canonical CityOS City ('calabar').
 */
export const CALABAR_ADMINISTRATIVE_LGAS: Record<AdministrativeLGAId, AdministrativeLGA> = {
  'calabar-municipal': {
    id: 'calabar-municipal',
    name: 'Calabar Municipal',
    code: 'CR-MUN',
    headquarters: 'Marian / Parliamentary Road',
    center: { latitude: 4.9820, longitude: 8.3420 },
  },
  'calabar-south': {
    id: 'calabar-south',
    name: 'Calabar South',
    code: 'CR-SOU',
    headquarters: 'Anantigha',
    center: { latitude: 4.9450, longitude: 8.3250 },
  },
};

/**
 * Operational Delivery Zones (ODZs) for Calabar.
 * Reuses and formalizes the 8 canonical neighborhood areas from `lib/city-areas.ts`,
 * adding administrative LGA links, spatial centroids, corridor keywords, and approximate radii.
 */
export const CALABAR_OPERATIONAL_ZONES: OperationalDeliveryZone[] = [
  {
    id: 'marian-road',
    code: 'DZ-CAL-01',
    name: 'Marian Road & Environs',
    shortName: 'Marian Road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9720, longitude: 8.3370 },
    approxRadiusKm: 2.5,
    description: 'Ndidem Usang Iso axis, fast casual, grills & bakeries',
    isPopular: true,
    isActive: true,
    corridors: ['ndidem usang iso', 'marian', 'lion bank', 'apex clinic', 'rabana', 'atekong'],
  },
  {
    id: 'state-housing',
    code: 'DZ-CAL-02',
    name: 'State Housing Estate',
    shortName: 'State Housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9850, longitude: 8.3420 },
    approxRadiusKm: 2.0,
    description: 'Upscale residential, boutique cafes & continental dining',
    isPopular: true,
    isActive: true,
    corridors: ['state housing', 'atekong drive', 'highway housing'],
  },
  {
    id: 'federal-housing',
    code: 'DZ-CAL-03',
    name: 'Federal Housing & Ikot Ansa',
    shortName: 'Federal Housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0200, longitude: 8.3480 },
    approxRadiusKm: 3.5,
    description: '8 Miles & Ikot Ansa highway corridor, family spots & transport hub',
    isPopular: true,
    isActive: true,
    corridors: ['federal housing', 'ikot ansa', '8 miles', 'eight miles', 'ikot omin', 'highway'],
  },
  {
    id: 'parliamentary',
    code: 'DZ-CAL-04',
    name: 'Parliamentary & Asari Eso',
    shortName: 'Parliamentary',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9920, longitude: 8.3580 },
    approxRadiusKm: 2.5,
    description: 'Parliamentary extension, municipal offices & executive dining',
    isPopular: true,
    isActive: true,
    corridors: ['parliamentary', 'asari eso', 'secretariat', 'municipal'],
  },
  {
    id: 'unical-campus',
    code: 'DZ-CAL-05',
    name: 'University of Calabar (Unical Campus)',
    shortName: 'Unical Campus',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9520, longitude: 8.3480 },
    approxRadiusKm: 2.0,
    description: 'Main Gate, Malabor corridor, student quick bites & fast food',
    isPopular: true,
    isActive: true,
    corridors: ['unical', 'university of calabar', 'malabor', 'campus', 'main gate'],
  },
  {
    id: 'etta-agbor',
    code: 'DZ-CAL-06',
    name: 'Etta Agbor & Mary Slessor',
    shortName: 'Etta Agbor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9650, longitude: 8.3350 },
    approxRadiusKm: 1.8,
    description: 'Student living corridor, shawarma spots & night eats',
    isPopular: false,
    isActive: true,
    corridors: ['etta agbor', 'mary slessor', 'slessor', 'rabana roundabout'],
  },
  {
    id: 'diamond-hill',
    code: 'DZ-CAL-07',
    name: 'Diamond Hill, Marina & Harbor',
    shortName: 'Diamond Hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9650, longitude: 8.3150 },
    approxRadiusKm: 2.2,
    description: 'Government House axis, waterfront dining & scenic lounges',
    isPopular: false,
    isActive: true,
    corridors: ['diamond hill', 'marina', 'harbor', 'harbour', 'epz', 'government house'],
  },
  {
    id: 'calabar-south',
    code: 'DZ-CAL-08',
    name: 'Calabar South & Watt Market',
    shortName: 'Calabar South',
    lgaId: 'calabar-south',
    center: { latitude: 4.9520, longitude: 8.3240 },
    approxRadiusKm: 2.5,
    description: 'Watt Market, Target, Goldie, native Calabar bukka kitchens',
    isPopular: true,
    isActive: true,
    corridors: ['watt', 'target', 'goldie', 'chamley', 'bedwell', 'calabar road'],
  },
  {
    id: 'anantigha-coastal',
    code: 'DZ-CAL-09',
    name: 'Anantigha, Mbukpa & Coastal',
    shortName: 'Anantigha',
    lgaId: 'calabar-south',
    center: { latitude: 4.9350, longitude: 8.3280 },
    approxRadiusKm: 3.0,
    description: 'Anantigha LGA secretariat, Mbukpa, Jebbs, CRUTECH / UNICROSS',
    isPopular: false,
    isActive: true,
    corridors: ['anantigha', 'mbukpa', 'jebbs', 'crutech', 'unicross', 'coastal'],
  },
];

/**
 * Key Calabar Landmarks with Verified Entrance Pins and Driver Notes.
 */
export const CALABAR_CANONICAL_LANDMARKS: CalabarLandmarkEntry[] = [
  {
    id: 'lion-bank-apex',
    name: 'Lion Bank / Apex Medical Center',
    alternativeNames: ['Apex Clinic Marian', 'Former Lion Bank Building'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9715, longitude: 8.3370 },
    entrancePin: { latitude: 4.9718, longitude: 8.3372 },
    driverNotes: 'Main entrance on Marian Road; heavy two-wheeler traffic around pharmacy arcade.',
    isVerified: true,
  },
  {
    id: 'rabana-roundabout',
    name: 'Rabana Roundabout',
    alternativeNames: ['Rabana', 'Ndidem Usang Iso Intersection'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9660, longitude: 8.3340 },
    entrancePin: { latitude: 4.9660, longitude: 8.3340 },
    driverNotes: 'Traffic circle connecting Marian, Etta Agbor, and MCC Road.',
    isVerified: true,
  },
  {
    id: 'unical-main-gate',
    name: 'University of Calabar (Main Gate)',
    alternativeNames: ['Unical Gate', 'Malabor Gate'],
    zoneId: 'unical-campus',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9540, longitude: 8.3440 },
    entrancePin: { latitude: 4.9545, longitude: 8.3438 },
    driverNotes: 'Security clearance required for vehicle entry; delivery drop-off point at visitor parking.',
    isVerified: true,
  },
  {
    id: 'watt-market-roundabout',
    name: 'Watt Market Commercial Core',
    alternativeNames: ['Watt Market', 'Calabar Road Junction'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9520, longitude: 8.3240 },
    entrancePin: { latitude: 4.9525, longitude: 8.3245 },
    driverNotes: 'High pedestrian and Keke congestion; motorbikes advised over four-wheel vans.',
    isVerified: true,
  },
  {
    id: 'state-housing-gate',
    name: 'State Housing Main Entrance',
    alternativeNames: ['State Housing Highway Gate'],
    zoneId: 'state-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9820, longitude: 8.3410 },
    entrancePin: { latitude: 4.9822, longitude: 8.3412 },
    driverNotes: 'Gated estate; visitor pass requested after 21:00 WAT.',
    isVerified: true,
  },
];
