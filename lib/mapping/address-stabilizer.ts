import type {
  AdministrativeLGAId,
  GeoPoint,
  OperationalDeliveryZone,
  CalabarLandmarkEntry,
} from './types';
import {
  CALABAR_CITY_METADATA,
  CALABAR_ADMINISTRATIVE_LGAS,
  CALABAR_OPERATIONAL_ZONES,
  CALABAR_CANONICAL_LANDMARKS,
  CALABAR_COARSE_BOUNDING_BOX,
} from './calabar-coverage';
import {
  calculateHaversineDistanceKm,
  resolvePointServiceability,
  validateCoordinate,
} from './serviceability';
import { detectAreaFromAddress } from '../city-areas';

/**
 * Expanded Canonical Landmark Directory for Calabar.
 * Merges baseline landmarks with additional verified commercial, administrative,
 * and residential entrance pins across Calabar Municipal and Calabar South.
 */
export const EXPANDED_CALABAR_LANDMARKS: CalabarLandmarkEntry[] = [
  ...CALABAR_CANONICAL_LANDMARKS,
  // Marian Road & Environs (Zone 1)
  {
    id: 'marian-market',
    name: 'Marian Market (Old Marian)',
    alternativeNames: ['Old Marian Market', 'Marian Market Main Gate', 'Ika Ika Oqua Market Marian'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9750, longitude: 8.3385 },
    entrancePin: { latitude: 4.9752, longitude: 8.3387 },
    driverNotes: 'Pedestrian heavy. Two-wheeler parking along Marian Road curb.',
    isVerified: true,
  },
  {
    id: 'calabar-airport-junction',
    name: 'Margaret Ekpo Airport Junction',
    alternativeNames: ['Airport Junction Calabar', 'IBB Way Airport Turnoff'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9680, longitude: 8.3480 },
    entrancePin: { latitude: 4.9680, longitude: 8.3480 },
    driverNotes: 'Major intersection connecting IBB Way to airport road.',
    isVerified: true,
  },
  {
    id: 'atekong-junction',
    name: 'Atekong & Marian Road Junction',
    alternativeNames: ['Atekong Junction', 'Atekong Drive Turnoff'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9780, longitude: 8.3395 },
    entrancePin: { latitude: 4.9782, longitude: 8.3397 },
    driverNotes: 'Busy Marian eatery and banking corridor.',
    isVerified: true,
  },
  {
    id: 'apex-specialist-hospital',
    name: 'Apex Specialist Clinic & Surgery',
    alternativeNames: ['Apex Clinic Marian', 'Apex Hospital'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9715, longitude: 8.3370 },
    entrancePin: { latitude: 4.9718, longitude: 8.3372 },
    driverNotes: 'Opposite Lion Bank, rapid motorcycle drop-off on Marian road.',
    isVerified: true,
  },
  {
    id: 'peace-mass-transit-marian',
    name: 'Peace Mass Transit Marian Terminal',
    alternativeNames: ['Peace Mass Calabar', 'PMT Marian Park'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9735, longitude: 8.3375 },
    entrancePin: { latitude: 4.9738, longitude: 8.3377 },
    driverNotes: 'Interstate passenger bus terminal. Heavy pedestrian morning and evening flow.',
    isVerified: true,
  },
  {
    id: 'akim-market-junction',
    name: 'Akim Market & IBB Way Junction',
    alternativeNames: ['Akim Market', 'IBB Way Akim'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9630, longitude: 8.3450 },
    entrancePin: { latitude: 4.9632, longitude: 8.3452 },
    driverNotes: 'Market roundabout linking IBB Way to Marian.',
    isVerified: true,
  },
  {
    id: 'young-shall-grow-park',
    name: 'Young Shall Grow Motors Marian Terminal',
    alternativeNames: ['YSG Motors Calabar', 'Young Shall Grow Marian'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9745, longitude: 8.3380 },
    entrancePin: { latitude: 4.9745, longitude: 8.3380 },
    driverNotes: 'Bus park entrance on Ndidem Usang Iso road.',
    isVerified: true,
  },
  {
    id: 'asi-ukpo-diagnostic',
    name: 'ASI Ukpo Diagnostic Medical Centre',
    alternativeNames: ['Asi Ukpo Hospital Marian', 'Asi Ukpo Comprehensive Oncology'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9760, longitude: 8.3388 },
    entrancePin: { latitude: 4.9762, longitude: 8.3390 },
    driverNotes: 'Direct road access with ambulance bay on Marian Road.',
    isVerified: true,
  },
  {
    id: 'margaret-ekpo-terminal',
    name: 'Margaret Ekpo International Airport Terminal',
    alternativeNames: ['Calabar Airport Terminal', 'Airport Arrival Hall'],
    zoneId: 'marian-road',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9725, longitude: 8.3510 },
    entrancePin: { latitude: 4.9728, longitude: 8.3512 },
    driverNotes: 'Airport drop-off lane. Security screening at entry checkpoint.',
    isVerified: true,
  },

  // State Housing Estate (Zone 2)
  {
    id: 'transcorp-hotels',
    name: 'Transcorp Hotels Calabar',
    alternativeNames: ['Transcorp Calabar', 'Metropolitan Hotel Highway'],
    zoneId: 'state-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9810, longitude: 8.3390 },
    entrancePin: { latitude: 4.9812, longitude: 8.3392 },
    driverNotes: 'Main hotel gate with security checkpoint. Driver parking by reception.',
    isVerified: true,
  },
  {
    id: 'mirage-hotel',
    name: 'The Mirage Hotel Calabar',
    alternativeNames: ['Mirage Hotel State Housing', 'Mirage Lounge Calabar'],
    zoneId: 'state-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9860, longitude: 8.3435 },
    entrancePin: { latitude: 4.9862, longitude: 8.3438 },
    driverNotes: 'Plot 230 State Housing Estate, quiet residential gate.',
    isVerified: true,
  },
  {
    id: 'venetian-arena',
    name: 'Venetian Arena & Event Centre',
    alternativeNames: ['Venetian Lounge Calabar', 'Venetian Hall Murtala Highway'],
    zoneId: 'state-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9835, longitude: 8.3415 },
    entrancePin: { latitude: 4.9838, longitude: 8.3418 },
    driverNotes: 'Spacious event driveway directly off Murtala Mohammed Highway.',
    isVerified: true,
  },
  {
    id: 'state-housing-parliamentary-gate',
    name: 'State Housing Parliamentary Gate',
    alternativeNames: ['State Housing Back Gate', 'Parliamentary Estate Link'],
    zoneId: 'state-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9880, longitude: 8.3460 },
    entrancePin: { latitude: 4.9882, longitude: 8.3462 },
    driverNotes: 'Security barrier between State Housing and Parliamentary Extension.',
    isVerified: true,
  },

  // Federal Housing & Ikot Ansa (Zone 3)
  {
    id: 'federal-housing-estate-gate',
    name: 'Federal Housing Estate Gate',
    alternativeNames: ['FHA Gate Ikot Ansa', 'Federal Housing 8 Miles Gate'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0120, longitude: 8.3490 },
    entrancePin: { latitude: 5.0122, longitude: 8.3492 },
    driverNotes: 'Northern highway corridor. Quick motorcycle access off MM Highway.',
    isVerified: true,
  },
  {
    id: 'ikot-ansa-junction',
    name: 'Ikot Ansa Bus Stop & Roundabout',
    alternativeNames: ['Ikot Ansa Junction', 'Ikot Ansa Highway Stop'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0080, longitude: 8.3470 },
    entrancePin: { latitude: 5.0082, longitude: 8.3472 },
    driverNotes: 'Key pedestrian transit node along Murtala Mohammed Highway.',
    isVerified: true,
  },
  {
    id: 'eight-miles-roundabout',
    name: '8 Miles Roundabout / Northern Gateway',
    alternativeNames: ['Eight Miles Calabar', '8 Miles Tollgate Roundabout', '8 Miles Junction'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0450, longitude: 8.3520 },
    entrancePin: { latitude: 5.0452, longitude: 8.3522 },
    driverNotes: 'Northern city limit boundary; interchange for Odukpani and interstate haulage.',
    isVerified: true,
  },
  {
    id: 'monty-suites',
    name: 'Monty Suites Calabar',
    alternativeNames: ['Monty Hotel', 'Monty Suites Federal Housing'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0160, longitude: 8.3510 },
    entrancePin: { latitude: 5.0162, longitude: 8.3512 },
    driverNotes: 'Luxury hospitality suites in Federal Housing Estate.',
    isVerified: true,
  },
  {
    id: 'ikot-ishie-market',
    name: 'Ikot Ishie Market & Motor Park',
    alternativeNames: ['Ikot Ishie Market Square', 'Ikot Ishie Bus Stop'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9980, longitude: 8.3450 },
    entrancePin: { latitude: 4.9982, longitude: 8.3452 },
    driverNotes: 'Traditional neighborhood food market along MM Highway.',
    isVerified: true,
  },
  {
    id: 'ikot-omin-market',
    name: 'Ikot Omin Market Junction',
    alternativeNames: ['Ikot Omin Bus Stop', 'Ikot Omin 8 Miles'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0320, longitude: 8.3510 },
    entrancePin: { latitude: 5.0322, longitude: 8.3512 },
    driverNotes: 'Suburban community market hub off the northern expressway.',
    isVerified: true,
  },
  {
    id: 'ucth-teaching-hospital-gate',
    name: 'University of Calabar Teaching Hospital (UCTH)',
    alternativeNames: ['UCTH Main Gate', 'Teaching Hospital Calabar', 'UCTH Emergency'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0180, longitude: 8.3620 },
    entrancePin: { latitude: 5.0185, longitude: 8.3622 },
    driverNotes: 'Tertiary referral medical centre. Clear gate security for accident/emergency drop-off.',
    isVerified: true,
  },
  {
    id: 'aktc-park-calabar',
    name: 'AKTC Calabar Transit Park (Highway)',
    alternativeNames: ['Akwa Ibom Transport Park', 'AKTC Terminal Calabar'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0040, longitude: 8.3460 },
    entrancePin: { latitude: 5.0042, longitude: 8.3462 },
    driverNotes: 'Major regional dispatch station on Murtala Mohammed Highway.',
    isVerified: true,
  },
  {
    id: 'federal-secretariat-calabar',
    name: 'Federal Secretariat Complex Calabar',
    alternativeNames: ['Federal Secretariat Highway', 'Federal Ministries Calabar'],
    zoneId: 'federal-housing',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0110, longitude: 8.3475 },
    entrancePin: { latitude: 5.0112, longitude: 8.3478 },
    driverNotes: 'Federal government civil service office complex.',
    isVerified: true,
  },

  // Parliamentary & Asari Eso (Zone 4)
  {
    id: 'parliamentary-extension-junction',
    name: 'Parliamentary Extension Secretariat',
    alternativeNames: ['Calabar Municipal Council', 'Parliamentary Roundabout'],
    zoneId: 'parliamentary',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9890, longitude: 8.3470 },
    entrancePin: { latitude: 4.9892, longitude: 8.3472 },
    driverNotes: 'Administrative zone. Visitor dropoff at security booth.',
    isVerified: true,
  },
  {
    id: 'calabar-municipal-council',
    name: 'Calabar Municipal Council Headquarters',
    alternativeNames: ['Marian Council Secretariat', 'Calabar Municipal LGA Secretariat'],
    zoneId: 'parliamentary',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9830, longitude: 8.3465 },
    entrancePin: { latitude: 4.9832, longitude: 8.3468 },
    driverNotes: 'Local government administrative complex off Parliamentary Road.',
    isVerified: true,
  },
  {
    id: 'asari-eso-junction',
    name: 'Asari Eso & MCC Link Junction',
    alternativeNames: ['Asari Eso Bus Stop', 'Asari Eso Gate'],
    zoneId: 'parliamentary',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9840, longitude: 8.3540 },
    entrancePin: { latitude: 4.9842, longitude: 8.3542 },
    driverNotes: 'Residential corridor connecting Parliamentary Road to MCC.',
    isVerified: true,
  },
  {
    id: 'cross-river-judiciary',
    name: 'Cross River State High Court Complex',
    alternativeNames: ['Judiciary Complex Parliamentary', 'Customary Court of Appeal Calabar'],
    zoneId: 'parliamentary',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9910, longitude: 8.3510 },
    entrancePin: { latitude: 4.9912, longitude: 8.3512 },
    driverNotes: 'State judiciary headquarters on Parliamentary Extension.',
    isVerified: true,
  },

  // Satellite Town & Ikot Effanga (Zone 5)
  {
    id: 'satellite-town-first-gate',
    name: 'Satellite Town First Gate',
    alternativeNames: ['Satellite Town Main Gate', 'Satellite Gate 1'],
    zoneId: 'satellite-town',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0020, longitude: 8.3610 },
    entrancePin: { latitude: 5.0022, longitude: 8.3612 },
    driverNotes: 'Main guarded residential gate into Satellite Town.',
    isVerified: true,
  },
  {
    id: 'satellite-town-second-gate',
    name: 'Satellite Town Second Gate',
    alternativeNames: ['Satellite Gate 2', 'Satellite Back Gate'],
    zoneId: 'satellite-town',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0080, longitude: 8.3660 },
    entrancePin: { latitude: 5.0082, longitude: 8.3662 },
    driverNotes: 'Secondary residential exit connecting towards Ikot Effanga.',
    isVerified: true,
  },
  {
    id: 'ikot-effanga-junction',
    name: 'Ikot Effanga Mkpa Junction',
    alternativeNames: ['Ikot Effanga Bus Stop', 'Ikot Effanga Square'],
    zoneId: 'satellite-town',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0150, longitude: 8.3710 },
    entrancePin: { latitude: 5.0152, longitude: 8.3712 },
    driverNotes: 'Vibrant residential village hub adjacent to Satellite Town.',
    isVerified: true,
  },
  {
    id: 'satellite-police-station',
    name: 'Satellite Town Divisional Police Station',
    alternativeNames: ['Satellite Police Station', 'Ikot Effanga Police Outpost'],
    zoneId: 'satellite-town',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0040, longitude: 8.3630 },
    entrancePin: { latitude: 5.0042, longitude: 8.3632 },
    driverNotes: 'Security station on central Satellite Town boulevard.',
    isVerified: true,
  },

  // MCC Road & Effio-Ette (Zone 6)
  {
    id: 'effio-ette-roundabout',
    name: 'Effio-Ette Roundabout (MCC / Highway)',
    alternativeNames: ['Effio-Ette Junction', 'Effioette Roundabout', 'Effio Ette Square'],
    zoneId: 'mcc-effioette',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9760, longitude: 8.3460 },
    entrancePin: { latitude: 4.9762, longitude: 8.3462 },
    driverNotes: 'Primary transit roundabout connecting MCC Road, Marian, and Highway.',
    isVerified: true,
  },
  {
    id: 'channel-view-hotel',
    name: 'Channel View Hotel Calabar',
    alternativeNames: ['Channel View MCC', 'Channel View Hotel & Suites'],
    zoneId: 'mcc-effioette',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9785, longitude: 8.3495 },
    entrancePin: { latitude: 4.9788, longitude: 8.3498 },
    driverNotes: '27 MCC Road. Landmark hotel and conference facility.',
    isVerified: true,
  },
  {
    id: 'mobil-roundabout',
    name: 'Mobil Roundabout (Highway / MCC)',
    alternativeNames: ['Mobil Filling Station Roundabout', 'MCC Highway Mobil'],
    zoneId: 'mcc-effioette',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9720, longitude: 8.3420 },
    entrancePin: { latitude: 4.9722, longitude: 8.3422 },
    driverNotes: 'Busy fuel retail station and junction on Murtala Mohammed Highway.',
    isVerified: true,
  },
  {
    id: 'asim-ita-junction',
    name: 'Asim Ita & MCC Road Junction',
    alternativeNames: ['Asim Ita Street', 'Asim Ita MCC Turnoff'],
    zoneId: 'mcc-effioette',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9810, longitude: 8.3520 },
    entrancePin: { latitude: 4.9812, longitude: 8.3522 },
    driverNotes: 'Residential and bakery street off MCC Road.',
    isVerified: true,
  },

  // Akai Effa & Highway North (Zone 7)
  {
    id: 'akai-effa-junction',
    name: 'Akai Effa Junction (Northern Bypass)',
    alternativeNames: ['Akai Effa Bus Stop', 'Akai Effa Market Junction'],
    zoneId: 'akai-effa',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0310, longitude: 8.3580 },
    entrancePin: { latitude: 5.0312, longitude: 8.3582 },
    driverNotes: 'Fast-developing residential corridor north of Federal Housing.',
    isVerified: true,
  },
  {
    id: 'scan-water-bypass',
    name: 'Scan Water Bus Stop (Akai Effa)',
    alternativeNames: ['Scan Water Junction', 'Scan Water Estate'],
    zoneId: 'akai-effa',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0380, longitude: 8.3610 },
    entrancePin: { latitude: 5.0382, longitude: 8.3612 },
    driverNotes: 'Bypass road transit junction for suburban estates.',
    isVerified: true,
  },
  {
    id: 'tinapa-gateway',
    name: 'Tinapa Free Zone Gateway (Adiabo Link)',
    alternativeNames: ['Tinapa Junction', 'Tinapa Business Resort Gate'],
    zoneId: 'akai-effa',
    lgaId: 'calabar-municipal',
    center: { latitude: 5.0510, longitude: 8.3650 },
    entrancePin: { latitude: 5.0515, longitude: 8.3652 },
    driverNotes: 'Gateway to Tinapa Business and Leisure Resort.',
    isVerified: true,
  },

  // Atimbo Corridor (Zone 8)
  {
    id: 'atimbo-roundabout',
    name: 'Atimbo Roundabout',
    alternativeNames: ['Atimbo Junction', 'Atimbo Road Circle'],
    zoneId: 'atimbo-corridor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9680, longitude: 8.3680 },
    entrancePin: { latitude: 4.9682, longitude: 8.3682 },
    driverNotes: 'Interchange heading toward Akpabuyo and Bakassi highway.',
    isVerified: true,
  },
  {
    id: 'navy-post-service-gate',
    name: 'Navy Post Service Housing Estate Gate',
    alternativeNames: ['Navy Estate Atimbo', 'Post Service Navy Gate'],
    zoneId: 'atimbo-corridor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9720, longitude: 8.3790 },
    entrancePin: { latitude: 4.9722, longitude: 8.3792 },
    driverNotes: 'Naval officers residential estate. Armed forces checkpoint at entry.',
    isVerified: true,
  },
  {
    id: 'atimbo-bridge-market',
    name: 'Atimbo Bridge Fish Market',
    alternativeNames: ['Atimbo Bridge', 'Atimbo Riverfront Market'],
    zoneId: 'atimbo-corridor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9750, longitude: 8.3890 },
    entrancePin: { latitude: 4.9752, longitude: 8.3892 },
    driverNotes: 'Fresh river fish and seafood retail jetty by the bridge.',
    isVerified: true,
  },
  {
    id: 'ediba-community-junction',
    name: 'Ediba Community Junction',
    alternativeNames: ['Ediba Road Bus Stop', 'Ediba Market Junction'],
    zoneId: 'atimbo-corridor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9810, longitude: 8.3720 },
    entrancePin: { latitude: 4.9812, longitude: 8.3722 },
    driverNotes: 'Coastal village corridor leading to Ediba water beach.',
    isVerified: true,
  },

  // University of Calabar (Unical Campus) (Zone 9)
  {
    id: 'unical-malabor-gate',
    name: 'Unical Malabor Gate (Students Hall)',
    alternativeNames: ['Malabor Gate', 'Unical Hall 4 Gate', 'Male Hostel Gate Unical'],
    zoneId: 'unical-campus',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9490, longitude: 8.3460 },
    entrancePin: { latitude: 4.9492, longitude: 8.3462 },
    driverNotes: 'High student traffic. Delivery bikes drop off at hostel pavilion.',
    isVerified: true,
  },
  {
    id: 'unical-small-gate',
    name: 'Unical Small Gate (Staff Quarters)',
    alternativeNames: ['Unical Second Gate', 'Staff Quarters Gate Unical'],
    zoneId: 'unical-campus',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9580, longitude: 8.3510 },
    entrancePin: { latitude: 4.9582, longitude: 8.3512 },
    driverNotes: 'Quiet access gate for academic and senior staff residential quarters.',
    isVerified: true,
  },
  {
    id: 'unical-medical-campus',
    name: 'Unical College of Medical Sciences',
    alternativeNames: ['Medical Campus Unical', 'Unical Medical Library'],
    zoneId: 'unical-campus',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9510, longitude: 8.3430 },
    entrancePin: { latitude: 4.9512, longitude: 8.3432 },
    driverNotes: 'Medical student classrooms and basic medical science lecture halls.',
    isVerified: true,
  },
  {
    id: 'unical-senate-building',
    name: 'University of Calabar Senate Building',
    alternativeNames: ['Unical Administrative Block', 'VC Office Unical'],
    zoneId: 'unical-campus',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9530, longitude: 8.3465 },
    entrancePin: { latitude: 4.9532, longitude: 8.3468 },
    driverNotes: 'Administrative headquarters of UNICAL. Dedicated visitor parking.',
    isVerified: true,
  },

  // Etta Agbor & Mary Slessor (Zone 10)
  {
    id: 'etta-agbor-slessor-junction',
    name: 'Etta Agbor & Mary Slessor Roundabout',
    alternativeNames: ['Mary Slessor Roundabout', 'Etta Agbor Gate'],
    zoneId: 'etta-agbor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9620, longitude: 8.3390 },
    entrancePin: { latitude: 4.9620, longitude: 8.3390 },
    driverNotes: 'Student hub; shawarma and eatery corridor.',
    isVerified: true,
  },
  {
    id: 'general-hospital-mary-slessor',
    name: 'General Hospital Calabar (Mary Slessor)',
    alternativeNames: ['General Hospital Calabar', 'Mary Slessor Hospital'],
    zoneId: 'etta-agbor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9600, longitude: 8.3340 },
    entrancePin: { latitude: 4.9602, longitude: 8.3342 },
    driverNotes: 'State general hospital entrance on Mary Slessor Avenue.',
    isVerified: true,
  },
  {
    id: 'wapi-junction',
    name: 'West African People\'s Institute (WAPI) Gate',
    alternativeNames: ['WAPI Calabar', 'WAPI Junction Mary Slessor'],
    zoneId: 'etta-agbor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9640, longitude: 8.3360 },
    entrancePin: { latitude: 4.9642, longitude: 8.3362 },
    driverNotes: 'Historic college entrance along Mary Slessor Avenue.',
    isVerified: true,
  },
  {
    id: 'st-patricks-college',
    name: 'St. Patrick\'s College Ikot Ansa',
    alternativeNames: ['SPC Calabar', 'St Patricks Gate'],
    zoneId: 'etta-agbor',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9665, longitude: 8.3380 },
    entrancePin: { latitude: 4.9668, longitude: 8.3382 },
    driverNotes: 'Prominent mission school gate on Etta Agbor road.',
    isVerified: true,
  },

  // Diamond Hill, Marina & Harbor (Zone 11)
  {
    id: 'uj-esuene-stadium',
    name: 'U.J. Esuene Stadium',
    alternativeNames: ['Calabar Stadium', 'Esuene Stadium Highway Gate'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9580, longitude: 8.3310 },
    entrancePin: { latitude: 4.9585, longitude: 8.3315 },
    driverNotes: 'Main gate on Murtala Mohammed Highway opposite cultural centre.',
    isVerified: true,
  },
  {
    id: 'spar-calabar-mall',
    name: 'SPAR Calabar Mall / Cultural Centre',
    alternativeNames: ['Calabar Mall', 'SPAR Highway'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9590, longitude: 8.3290 },
    entrancePin: { latitude: 4.9592, longitude: 8.3295 },
    driverNotes: 'Designated courier dispatch parking near retail entrance.',
    isVerified: true,
  },
  {
    id: 'cross-river-government-house',
    name: 'Cross River State Government House',
    alternativeNames: ['Government House Calabar', 'Governor\'s Office Diamond Hill'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9680, longitude: 8.3190 },
    entrancePin: { latitude: 4.9682, longitude: 8.3192 },
    driverNotes: 'Executive state government seat. Maximum security protocol at gates.',
    isVerified: true,
  },
  {
    id: 'marina-resort',
    name: 'Marina Resort Waterfront & Slave Museum',
    alternativeNames: ['Marina Calabar', 'Waterfront Resort', 'Slave History Museum'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9610, longitude: 8.3180 },
    entrancePin: { latitude: 4.9615, longitude: 8.3185 },
    driverNotes: 'Scenic harbor axis. Security checkpoint at main drive entrance.',
    isVerified: true,
  },
  {
    id: 'cultural-centre-complex',
    name: 'Cultural Centre Complex Calabar',
    alternativeNames: ['Cultural Centre Roundabout', 'Cultural Complex Calabar'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9570, longitude: 8.3280 },
    entrancePin: { latitude: 4.9572, longitude: 8.3282 },
    driverNotes: 'Major civic events and theater venue near SPAR Mall.',
    isVerified: true,
  },
  {
    id: 'eleven-eleven-roundabout',
    name: '11:11 Millennium Park Roundabout',
    alternativeNames: ['Eleven Eleven Roundabout', 'Millennium Park Calabar'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9595, longitude: 8.3245 },
    entrancePin: { latitude: 4.9595, longitude: 8.3245 },
    driverNotes: 'Historic cenotaph roundabout connecting Calabar Road to Highway.',
    isVerified: true,
  },
  {
    id: 'zone-6-police-hq',
    name: 'Zone 6 Police Zonal Headquarters',
    alternativeNames: ['Zone 6 Police Calabar', 'Police Headquarters Highway'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9620, longitude: 8.3270 },
    entrancePin: { latitude: 4.9622, longitude: 8.3272 },
    driverNotes: 'Zonal police command for Cross River and Akwa Ibom states.',
    isVerified: true,
  },
  {
    id: 'eastern-naval-command',
    name: 'Eastern Naval Command Headquarters',
    alternativeNames: ['Navy Command Calabar', 'Eastern Naval Base'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9660, longitude: 8.3130 },
    entrancePin: { latitude: 4.9662, longitude: 8.3132 },
    driverNotes: 'Military naval base on Diamond Hill waterfront. Strict clearance required.',
    isVerified: true,
  },
  {
    id: 'hope-waddell-gate',
    name: 'Hope Waddell Training Institution (HWTI)',
    alternativeNames: ['Hope Waddell Calabar', 'Hope Waddell Main Gate'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9560, longitude: 8.3150 },
    entrancePin: { latitude: 4.9562, longitude: 8.3152 },
    driverNotes: 'Historic first secondary school in Eastern Nigeria, Calabar waterfront.',
    isVerified: true,
  },
  {
    id: 'cross-river-state-library',
    name: 'Cross River State Library Complex',
    alternativeNames: ['State Library Calabar', 'Diamond Hill Library'],
    zoneId: 'diamond-hill',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9635, longitude: 8.3220 },
    entrancePin: { latitude: 4.9638, longitude: 8.3222 },
    driverNotes: 'Calm educational landmark on Diamond Hill road.',
    isVerified: true,
  },

  // Esuk Utan & EPZ / Free Trade Zone (Zone 12)
  {
    id: 'calabar-free-trade-zone',
    name: 'Calabar Free Trade Zone (CFTZ) Complex',
    alternativeNames: ['EPZ Calabar', 'Calabar EPZ Gate', 'Export Processing Zone'],
    zoneId: 'esuk-utan-industrial',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9850, longitude: 8.3110 },
    entrancePin: { latitude: 4.9852, longitude: 8.3112 },
    driverNotes: 'Industrial processing zone. Freight and staff delivery at main gatehouse.',
    isVerified: true,
  },
  {
    id: 'npa-port-terminal',
    name: 'Nigerian Ports Authority (NPA) Calabar Port',
    alternativeNames: ['Calabar Port Main Gate', 'NPA Old Port', 'NPA New Port'],
    zoneId: 'esuk-utan-industrial',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9890, longitude: 8.3090 },
    entrancePin: { latitude: 4.9892, longitude: 8.3092 },
    driverNotes: 'Maritime cargo terminal. NPA port pass required for heavy vehicle entry.',
    isVerified: true,
  },
  {
    id: 'esuk-utan-jetty',
    name: 'Esuk Utan Depot & Tank Farms Gate',
    alternativeNames: ['Esuk Utan Tank Farms', 'Esuk Utan Oil Jetty'],
    zoneId: 'esuk-utan-industrial',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9810, longitude: 8.3140 },
    entrancePin: { latitude: 4.9812, longitude: 8.3142 },
    driverNotes: 'Petroleum depot corridor. Heavy tanker movements along access roads.',
    isVerified: true,
  },
  {
    id: 'ibeto-jetty',
    name: 'Ibeto Jetty & Calabar River Terminal',
    alternativeNames: ['Ibeto Jetty', 'Ibeto Port Calabar'],
    zoneId: 'esuk-utan-industrial',
    lgaId: 'calabar-municipal',
    center: { latitude: 4.9870, longitude: 8.3070 },
    entrancePin: { latitude: 4.9872, longitude: 8.3072 },
    driverNotes: 'Private maritime jetty and cement discharge terminal.',
    isVerified: true,
  },

  // Calabar South & Watt Market (Zone 13)
  {
    id: 'goldie-target-junction',
    name: 'Goldie Street & Target Road Junction',
    alternativeNames: ['Target Goldie Junction', 'Calabar South Junction'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9480, longitude: 8.3260 },
    entrancePin: { latitude: 4.9480, longitude: 8.3260 },
    driverNotes: 'Bustling commercial crossway in Calabar South.',
    isVerified: true,
  },
  {
    id: 'chamley-target-junction',
    name: 'Chamley Street & Target Road Junction',
    alternativeNames: ['Chamley Junction', 'Target Chamley Corner'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9495, longitude: 8.3210 },
    entrancePin: { latitude: 4.9495, longitude: 8.3210 },
    driverNotes: 'High-density residential and retail shops in old Calabar South.',
    isVerified: true,
  },
  {
    id: 'bedwell-calabar-road',
    name: 'Bedwell Street Commercial Line',
    alternativeNames: ['Bedwell Market Junction', 'Bedwell Auto Spares Street'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9540, longitude: 8.3230 },
    entrancePin: { latitude: 4.9542, longitude: 8.3232 },
    driverNotes: 'Automotive parts and electronics wholesale arcade.',
    isVerified: true,
  },
  {
    id: 'sacred-heart-cathedral',
    name: 'Sacred Heart Catholic Cathedral (Egerton)',
    alternativeNames: ['Sacred Heart Calabar', 'Catholic Cathedral Egerton Street'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9530, longitude: 8.3180 },
    entrancePin: { latitude: 4.9532, longitude: 8.3182 },
    driverNotes: 'Historic diocesan cathedral on Egerton Street, Calabar South.',
    isVerified: true,
  },
  {
    id: 'duke-town-presbyterian',
    name: 'Duke Town Presbyterian Church (Eyamba)',
    alternativeNames: ['Duke Town Church', 'Eyamba Presbyterian Calabar'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9550, longitude: 8.3160 },
    entrancePin: { latitude: 4.9552, longitude: 8.3162 },
    driverNotes: 'Historic missionary church perched above Calabar River.',
    isVerified: true,
  },
  {
    id: 'white-house-junction',
    name: 'White House Junction (Calabar South)',
    alternativeNames: ['White House Bus Stop', 'White House Calabar Road'],
    zoneId: 'calabar-south',
    lgaId: 'calabar-south',
    center: { latitude: 4.9460, longitude: 8.3240 },
    entrancePin: { latitude: 4.9462, longitude: 8.3242 },
    driverNotes: 'Busy neighborhood transit point connecting Target to Goldie.',
    isVerified: true,
  },

  // Bogobiri & Commercial Hub (Zone 14)
  {
    id: 'bogobiri-central-mosque',
    name: 'Bogobiri Central Mosque & Suya Arcade',
    alternativeNames: ['Bogobiri Mosque', 'Bogobiri Suya Line', 'Hausa Quarters Calabar'],
    zoneId: 'bogobiri-central',
    lgaId: 'calabar-south',
    center: { latitude: 4.9580, longitude: 8.3220 },
    entrancePin: { latitude: 4.9582, longitude: 8.3222 },
    driverNotes: 'Famous Calabar suya and roasted meat market. Peak activity 17:00–23:00 WAT.',
    isVerified: true,
  },
  {
    id: 'bogobiri-market',
    name: 'Bogobiri Commercial Market',
    alternativeNames: ['Bogobiri Trade Line', 'Bogobiri Grains Market'],
    zoneId: 'bogobiri-central',
    lgaId: 'calabar-south',
    center: { latitude: 4.9570, longitude: 8.3210 },
    entrancePin: { latitude: 4.9572, longitude: 8.3212 },
    driverNotes: 'Wholesale grains, spices, and dried goods commercial depot.',
    isVerified: true,
  },
  {
    id: 'calabar-road-hardware',
    name: 'Calabar Road Hardware & Building Materials Hub',
    alternativeNames: ['Calabar Road Hardware', 'Iron Rod Market Calabar'],
    zoneId: 'bogobiri-central',
    lgaId: 'calabar-south',
    center: { latitude: 4.9560, longitude: 8.3225 },
    entrancePin: { latitude: 4.9562, longitude: 8.3228 },
    driverNotes: 'High pedestrian and hand-cart traffic. Motorbikes recommended.',
    isVerified: true,
  },

  // Mbukpa & Jebbs (Zone 15)
  {
    id: 'mbukpa-market',
    name: 'Mbukpa Market Square',
    alternativeNames: ['Mbukpa Market Calabar', 'Mbukpa Roundabout'],
    zoneId: 'mbukpa-jebbs',
    lgaId: 'calabar-south',
    center: { latitude: 4.9430, longitude: 8.3170 },
    entrancePin: { latitude: 4.9432, longitude: 8.3172 },
    driverNotes: 'Traditional neighborhood food stuff and seafood market.',
    isVerified: true,
  },
  {
    id: 'edgerley-junction',
    name: 'Edgerley Road & Mayne Avenue Junction',
    alternativeNames: ['Edgerley Junction', 'Mayne Avenue Edgerley Stop'],
    zoneId: 'mbukpa-jebbs',
    lgaId: 'calabar-south',
    center: { latitude: 4.9450, longitude: 8.3190 },
    entrancePin: { latitude: 4.9452, longitude: 8.3192 },
    driverNotes: 'Major intersection connecting central Calabar South to waterfront.',
    isVerified: true,
  },
  {
    id: 'jebbs-creek-line',
    name: 'Jebbs Street Waterfront & Beach Line',
    alternativeNames: ['Jebbs Street Beach', 'Jebbs Waterfront'],
    zoneId: 'mbukpa-jebbs',
    lgaId: 'calabar-south',
    center: { latitude: 4.9390, longitude: 8.3150 },
    entrancePin: { latitude: 4.9392, longitude: 8.3152 },
    driverNotes: 'Riverfront fish smoking and canoe landing beach.',
    isVerified: true,
  },
  {
    id: 'foster-mayne-avenue',
    name: 'Foster Street & Mayne Avenue Crossway',
    alternativeNames: ['Foster Junction', 'Mayne Avenue Foster Turnoff'],
    zoneId: 'mbukpa-jebbs',
    lgaId: 'calabar-south',
    center: { latitude: 4.9410, longitude: 8.3200 },
    entrancePin: { latitude: 4.9412, longitude: 8.3202 },
    driverNotes: 'Residential street corridor with local kiosks and kitchens.',
    isVerified: true,
  },

  // Anantigha & UNICROSS / CRUTECH (Zone 16)
  {
    id: 'anantigha-secretariat',
    name: 'Calabar South LGA Secretariat (Anantigha)',
    alternativeNames: ['Anantigha Council', 'Calabar South Secretariat'],
    zoneId: 'anantigha-coastal',
    lgaId: 'calabar-south',
    center: { latitude: 4.9350, longitude: 8.3280 },
    entrancePin: { latitude: 4.9352, longitude: 8.3282 },
    driverNotes: 'Southern coastal administrative headquarters.',
    isVerified: true,
  },
  {
    id: 'crutech-main-gate',
    name: 'UNICROSS / CRUTECH Main Gate Ekpo Abasi',
    alternativeNames: ['CRUTECH Gate', 'Cross River University Gate', 'Ekpo Abasi Campus'],
    zoneId: 'anantigha-coastal',
    lgaId: 'calabar-south',
    center: { latitude: 4.9380, longitude: 8.3220 },
    entrancePin: { latitude: 4.9382, longitude: 8.3222 },
    driverNotes: 'Main security gate on Ekpo Abasi Street. Dispatch dropoff at security pavilion.',
    isVerified: true,
  },
  {
    id: 'crutech-second-gate',
    name: 'UNICROSS / CRUTECH Second Gate',
    alternativeNames: ['CRUTECH Back Gate', 'UNICROSS Hostel Gate'],
    zoneId: 'anantigha-coastal',
    lgaId: 'calabar-south',
    center: { latitude: 4.9340, longitude: 8.3200 },
    entrancePin: { latitude: 4.9342, longitude: 8.3202 },
    driverNotes: 'Student hostels and engineering workshop gate.',
    isVerified: true,
  },
  {
    id: 'anantigha-beach',
    name: 'Anantigha Beach & Marine Police Outpost',
    alternativeNames: ['Anantigha Beach', 'Anantigha Jetty', 'Marine Base Anantigha'],
    zoneId: 'anantigha-coastal',
    lgaId: 'calabar-south',
    center: { latitude: 4.9280, longitude: 8.3300 },
    entrancePin: { latitude: 4.9282, longitude: 8.3302 },
    driverNotes: 'Southernmost coastal jetty and fish market in Calabar.',
    isVerified: true,
  },
  {
    id: 'ekpo-abasi-roundabout',
    name: 'Ekpo Abasi Roundabout',
    alternativeNames: ['Ekpo Abasi Junction', 'Ekpo Abasi Crossway'],
    zoneId: 'anantigha-coastal',
    lgaId: 'calabar-south',
    center: { latitude: 4.9410, longitude: 8.3250 },
    entrancePin: { latitude: 4.9412, longitude: 8.3252 },
    driverNotes: 'Key student transit circle leading directly to UNICROSS campus.',
    isVerified: true,
  },
];

/**
 * Standard Stabilized Address Contract
 */
export interface StabilizedAddress {
  formattedAddress: string;
  streetLine?: string;
  landmarkId?: string;
  landmarkName?: string;
  zoneId: string;
  zoneName: string;
  lgaId: AdministrativeLGAId;
  lgaName: string;
  citySlug: string;
  cityName: string;
  latitude: number;
  longitude: number;
  visualDescription?: string;
  driverNotes?: string;
  confidenceScore: number;
  resolutionSource: 'EXPLICIT_GPS' | 'LANDMARK_PIN' | 'ZONE_CENTROID' | 'CALABAR_CORE';
  isServiceable: boolean;
}

export interface AddressStabilizationInput {
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  landmarkId?: string | null;
  zoneId?: string | null;
  lgaId?: string | null;
  visualDescription?: string | null;
  driverNotes?: string | null;
}

/**
 * Unified LGA Normalizer:
 * Merges "Calabar", "Calabar Municipality", and "Calabar Municipal" into 'calabar-municipal'
 * while preserving 'calabar-south' for the southern commercial and coastal district.
 */
export function normalizeCalabarLGA(inputLga?: string | null): AdministrativeLGAId {
  if (!inputLga) return 'calabar-municipal';
  const clean = inputLga.trim().toLowerCase();
  if (
    clean.includes('south') ||
    clean.includes('anantigha') ||
    clean.includes('watt') ||
    clean.includes('mbukpa') ||
    clean.includes('cr-sou')
  ) {
    return 'calabar-south';
  }
  // All other references ("calabar", "calabar municipal", "calabar municipality", "cr-mun") merge to calabar-municipal
  return 'calabar-municipal';
}

/**
 * Searches local canonical landmarks with instant offline client-side performance (<1ms).
 */
export function searchLocalLandmarks(query: string, lgaId?: string | null): CalabarLandmarkEntry[] {
  const clean = (query || '').trim().toLowerCase();
  const normalizedLga = lgaId ? normalizeCalabarLGA(lgaId) : null;

  return EXPANDED_CALABAR_LANDMARKS.filter((landmark) => {
    if (normalizedLga && landmark.lgaId !== normalizedLga) return false;
    if (!clean) return true;

    return (
      landmark.name.toLowerCase().includes(clean) ||
      landmark.alternativeNames.some((alt) => alt.toLowerCase().includes(clean)) ||
      (landmark.driverNotes && landmark.driverNotes.toLowerCase().includes(clean))
    );
  });
}

/**
 * Calculates Address Confidence Score (0 to 100)
 */
export function scoreAddressConfidence(address: Partial<StabilizedAddress>): number {
  let score = 0;

  // 1. Spatial Precision (40 pts)
  if (address.resolutionSource === 'EXPLICIT_GPS') {
    score += 40;
  } else if (address.resolutionSource === 'LANDMARK_PIN') {
    score += 35;
  } else if (address.resolutionSource === 'ZONE_CENTROID') {
    score += 20;
  } else if (address.latitude && address.longitude) {
    score += 15;
  }

  // 2. Verified Landmark Anchor (25 pts)
  if (address.landmarkId && address.landmarkId !== 'custom') {
    score += 25;
  }

  // 3. Operational Delivery Zone & LGA (20 pts)
  if (address.zoneId) {
    score += 15;
  }
  if (address.lgaId) {
    score += 5;
  }

  // 4. Street / Visual Details (15 pts)
  if (address.visualDescription && address.visualDescription.trim().length > 3) {
    score += 10;
  }
  if (address.streetLine && address.streetLine.trim().length > 3) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Finds the closest verified landmark to a given coordinate.
 */
export function findNearestLandmark(
  point: GeoPoint,
  maxDistanceKm: number = 3.0
): { landmark: CalabarLandmarkEntry; distanceKm: number } | null {
  let bestMatch: CalabarLandmarkEntry | null = null;
  let minDistance = Infinity;

  for (const landmark of EXPANDED_CALABAR_LANDMARKS) {
    const pin = landmark.entrancePin || landmark.center;
    const dist = calculateHaversineDistanceKm(
      point.latitude,
      point.longitude,
      pin.latitude,
      pin.longitude
    );
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = landmark;
    }
  }

  if (bestMatch && minDistance <= maxDistanceKm) {
    return { landmark: bestMatch, distanceKm: minDistance };
  }
  return null;
}

/**
 * Main Address Stabilization Function:
 * Takes raw or semi-structured user input and transforms it into a standardized,
 * geocoded, landmark-anchored, and confidence-scored address object.
 */
export function stabilizeAddressInput(input: AddressStabilizationInput): StabilizedAddress {
  let targetLat: number | null = null;
  let targetLng: number | null = null;
  let resolutionSource: StabilizedAddress['resolutionSource'] = 'CALABAR_CORE';
  let matchedLandmark: CalabarLandmarkEntry | null = null;
  let matchedZone: OperationalDeliveryZone | null = null;

  // 1. Check for explicit coordinates
  const coordValidation = validateCoordinate(
    input.latitude != null && input.longitude != null
      ? { latitude: input.latitude, longitude: input.longitude }
      : null
  );

  if (coordValidation.valid && input.latitude != null && input.longitude != null) {
    targetLat = input.latitude;
    targetLng = input.longitude;
    resolutionSource = 'EXPLICIT_GPS';

    // Reverse snap to nearest landmark
    const nearest = findNearestLandmark({ latitude: targetLat, longitude: targetLng }, 2.0);
    if (nearest) {
      matchedLandmark = nearest.landmark;
    }
  }

  // 2. Check for explicit or matched Landmark
  if (!targetLat && input.landmarkId) {
    matchedLandmark =
      EXPANDED_CALABAR_LANDMARKS.find((l) => l.id === input.landmarkId) || null;
    if (matchedLandmark) {
      const pin = matchedLandmark.entrancePin || matchedLandmark.center;
      targetLat = pin.latitude;
      targetLng = pin.longitude;
      resolutionSource = 'LANDMARK_PIN';
    }
  }

  // 3. Fallback Heuristic: Parse text for landmark or zone keywords
  if (!targetLat && input.addressText) {
    const textLower = input.addressText.toLowerCase();

    // Search landmark names and aliases
    for (const l of EXPANDED_CALABAR_LANDMARKS) {
      if (
        textLower.includes(l.name.toLowerCase()) ||
        l.alternativeNames.some((alt) => textLower.includes(alt.toLowerCase()))
      ) {
        matchedLandmark = l;
        const pin = l.entrancePin || l.center;
        targetLat = pin.latitude;
        targetLng = pin.longitude;
        resolutionSource = 'LANDMARK_PIN';
        break;
      }
    }

    // If still no coordinate, use city-areas corridor heuristic
    if (!targetLat) {
      const area = detectAreaFromAddress('calabar', input.addressText);
      if (area) {
        matchedZone =
          CALABAR_OPERATIONAL_ZONES.find((z) => z.id === area.id) || null;
        if (matchedZone) {
          targetLat = matchedZone.center.latitude;
          targetLng = matchedZone.center.longitude;
          resolutionSource = 'ZONE_CENTROID';
        }
      }
    }
  }

  // 4. Fallback to explicit zone
  if (!targetLat && input.zoneId) {
    matchedZone =
      CALABAR_OPERATIONAL_ZONES.find((z) => z.id === input.zoneId) || null;
    if (matchedZone) {
      targetLat = matchedZone.center.latitude;
      targetLng = matchedZone.center.longitude;
      resolutionSource = 'ZONE_CENTROID';
    }
  }

  // 5. Ultimate Fallback to Calabar Core Center
  if (!targetLat || !targetLng) {
    targetLat = CALABAR_CITY_METADATA.center.latitude;
    targetLng = CALABAR_CITY_METADATA.center.longitude;
    resolutionSource = 'CALABAR_CORE';
  }

  // Resolve Zone and LGA
  if (!matchedZone && matchedLandmark) {
    matchedZone =
      CALABAR_OPERATIONAL_ZONES.find((z) => z.id === matchedLandmark.zoneId) || null;
  }

  const pointServ = resolvePointServiceability({ latitude: targetLat, longitude: targetLng });
  if (!matchedZone && pointServ.zone) {
    matchedZone = pointServ.zone;
  }

  const effectiveZone = matchedZone || CALABAR_OPERATIONAL_ZONES[0];
  const effectiveLgaId: AdministrativeLGAId = normalizeCalabarLGA(
    input.lgaId || matchedLandmark?.lgaId || effectiveZone.lgaId
  );
  const effectiveLga = CALABAR_ADMINISTRATIVE_LGAS[effectiveLgaId];

  // Build clean, human-readable formatted address
  const streetPart = input.addressText?.trim() || '';
  const landmarkPart = matchedLandmark ? `Near ${matchedLandmark.name}` : '';
  const zonePart = effectiveZone.shortName || effectiveZone.name;
  const lgaDisplay = effectiveLgaId === 'calabar-municipal' ? 'Calabar Municipal' : 'Calabar South';

  const parts = [streetPart, landmarkPart, zonePart, lgaDisplay, 'Calabar'].filter(Boolean);
  // Deduplicate consecutive parts
  const formattedAddress = Array.from(new Set(parts)).join(', ');

  const result: StabilizedAddress = {
    formattedAddress,
    streetLine: streetPart || undefined,
    landmarkId: matchedLandmark?.id,
    landmarkName: matchedLandmark?.name,
    zoneId: effectiveZone.id,
    zoneName: effectiveZone.name,
    lgaId: effectiveLgaId,
    lgaName: effectiveLga.name,
    citySlug: CALABAR_CITY_METADATA.slug,
    cityName: CALABAR_CITY_METADATA.name,
    latitude: targetLat,
    longitude: targetLng,
    visualDescription: input.visualDescription?.trim() || undefined,
    driverNotes: input.driverNotes?.trim() || matchedLandmark?.driverNotes || undefined,
    confidenceScore: 0,
    resolutionSource,
    isServiceable: pointServ.status === 'INSIDE_COVERAGE',
  };

  result.confidenceScore = scoreAddressConfidence(result);
  return result;
}
