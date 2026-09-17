export type OSKind = 'shopos' | 'serviceos' | 'schoolos' | null;

export interface Neighborhood {
  id: string;
  name: string;
  x: number;
  y: number;
  blurb: string;
  kind: 'residential' | 'market' | 'civic' | 'outskirts';
}

export const NEIGHBORHOODS: Neighborhood[] = [
  { id: 'marian-road', name: 'Marian Road', x: 38, y: 38, blurb: 'City centre · market line', kind: 'market' },
  { id: 'big-qua-town', name: 'Big Qua Town', x: 20, y: 28, blurb: 'Fresh produce & families', kind: 'residential' },
  { id: 'state-housing', name: 'State Housing Estate', x: 82, y: 24, blurb: 'Home base · quiet lanes', kind: 'residential' },
  { id: 'ikot-ansa', name: 'Ikot Ansa', x: 28, y: 52, blurb: 'Schools & green streets', kind: 'residential' },
  { id: 'satellite-town', name: 'Satellite Town', x: 14, y: 60, blurb: 'Workshops & warehouses', kind: 'outskirts' },
  { id: 'nyakasang', name: 'Nyakasang', x: 50, y: 12, blurb: 'Government quarters', kind: 'civic' },
  { id: 'ekorinim', name: 'Ekorinim', x: 60, y: 32, blurb: 'Coffee houses & clinics', kind: 'residential' },
  { id: 'eight-miles', name: '8 Miles', x: 94, y: 46, blurb: 'Estate road outskirts', kind: 'outskirts' },
  { id: 'parliamentary-extension', name: 'Parliamentary Extension', x: 42, y: 20, blurb: 'Quiet executive closes', kind: 'residential' },
  { id: 'calabar-south', name: 'Calabar South', x: 52, y: 62, blurb: 'Marina & the canal', kind: 'civic' },
];

export function getNeighborhood(id: string): Neighborhood | undefined {
  return NEIGHBORHOODS.find((n) => n.id === id);
}

export interface UniverseOrg {
  id: string;
  slug: string;
  name: string;
  category: string;
  os: OSKind;
  osLabel: string;
  area: string;
  address: string;
  tagline: string;
  desc: string;
  rating: number;
  reviews: number;
  emoji: string;
  gradient: string;
  joined: string;
  verified: boolean;
  staff: number;
  customers: number;
  hours: string;
}

export const ORGS: UniverseOrg[] = [
  {
    id: 'org_freshmart_calabar',
    slug: 'freshmart-calabar',
    name: 'FreshMart Calabar',
    category: 'Grocery & Marketplace',
    os: 'shopos',
    osLabel: 'ShopOS',
    area: 'Big Qua Town',
    address: '14 Big Qua Town Line, Calabar',
    tagline: 'Fresh produce, weighed and priced in-app',
    desc: 'The anchor ShopOS demo store. Farm-fresh produce, pantry staples and household essentials — weighed on the market floor and priced live in naira. CityDrive delivers around Calabar.',
    rating: 4.8,
    reviews: 641,
    emoji: '🧺',
    gradient: 'from-teal-800 to-emerald-600',
    joined: '2024-02',
    verified: true,
    staff: 14,
    customers: 3120,
    hours: '6:00 AM – 9:00 PM · Daily',
  },
  {
    id: 'org_mamas_kitchen',
    slug: 'mamas-kitchen',
    name: "Mama's Kitchen Calabar",
    category: 'Restaurant',
    os: 'shopos',
    osLabel: 'ShopOS',
    area: 'Marian Road',
    address: '22 Marian Road, Calabar',
    tagline: 'Home plates, party trays, delivered hot',
    desc: 'Fresh fufu, afang and edikang ikong by the plate or the party tray. Cooked to order around Marian Road and delivered by CityDrive.',
    rating: 4.7,
    reviews: 428,
    emoji: '🍲',
    gradient: 'from-orange-600 to-amber-500',
    joined: '2024-05',
    verified: true,
    staff: 9,
    customers: 1890,
    hours: '10:00 AM – 9:30 PM · Daily',
  },
  {
    id: 'org_urban_threads',
    slug: 'urban-threads-calabar',
    name: 'Urban Threads Calabar',
    category: 'Fashion & Retail',
    os: 'shopos',
    osLabel: 'ShopOS',
    area: 'State Housing Estate',
    address: 'Margaret Ekpo Ave, S.H.E., Calabar',
    tagline: 'Ankara, office wear & street fits',
    desc: 'The fashion anchor. Locally-tailored ankara sets, office separates and weekend street fits, with next-day tailoring through the studio.',
    rating: 4.6,
    reviews: 310,
    emoji: '🧵',
    gradient: 'from-brand-700 to-brand-500',
    joined: '2024-08',
    verified: true,
    staff: 7,
    customers: 1240,
    hours: '9:00 AM – 8:00 PM · Mon–Sat',
  },
  {
    id: 'org_mikes_ac',
    slug: 'mikes-ac-services',
    name: "Mike's AC Services",
    category: 'HVAC & Home Services',
    os: 'serviceos',
    osLabel: 'ServiceOS',
    area: 'Ekorinim',
    address: '8 Ekorinim Road, Calabar',
    tagline: 'AC service, gas refills & installs',
    desc: 'The anchor ServiceOS demo business. Filter services, gas refills, new installs and window-unit pick-ups across Calabar metro — quoted before we touch the unit.',
    rating: 4.9,
    reviews: 276,
    emoji: '❄️',
    gradient: 'from-sky-700 to-cyan-500',
    joined: '2024-03',
    verified: true,
    staff: 5,
    customers: 980,
    hours: '8:00 AM – 7:00 PM · Mon–Sat',
  },
  {
    id: 'org_clean_care',
    slug: 'calabar-cleancare',
    name: 'Calabar CleanCare',
    category: 'Cleaning Services',
    os: 'serviceos',
    osLabel: 'ServiceOS',
    area: 'Satellite Town',
    address: '3 Satellite Road, Calabar',
    tagline: 'Deep cleans, offices & move-in',
    desc: 'Crew-based deep cleaning for homes, offices and move-ins. Your products or ours, with a walk-through checklist at the end.',
    rating: 4.7,
    reviews: 152,
    emoji: '🧹',
    gradient: 'from-emerald-700 to-teal-500',
    joined: '2024-06',
    verified: true,
    staff: 6,
    customers: 540,
    hours: '8:00 AM – 6:00 PM · Mon–Sat',
  },
  {
    id: 'org_moments_photo',
    slug: 'calabar-moments-photography',
    name: 'Calabar Moments Photography',
    category: 'Photography',
    os: 'serviceos',
    osLabel: 'ServiceOS',
    area: 'Big Qua Town',
    address: '9 Big Qua Town Line, Calabar',
    tagline: 'Weddings, gigs & studio sessions',
    desc: 'Portrait studio and event coverage crew — carnival, weddings, naming ceremonies and product shoots. Turnaround in 72 hours, galleries via CityOS.',
    rating: 4.8,
    reviews: 134,
    emoji: '📸',
    gradient: 'from-slate-800 to-slate-600',
    joined: '2024-09',
    verified: true,
    staff: 4,
    customers: 410,
    hours: '9:00 AM – 7:00 PM · Tue–Sun',
  },
  {
    id: 'org_hope_academy',
    slug: 'hope-academy',
    name: 'Hope Academy Calabar',
    category: 'School',
    os: 'schoolos',
    osLabel: 'SchoolOS',
    area: 'Ikot Ansa',
    address: '5 Hope Avenue, Ikot Ansa, Calabar',
    tagline: 'Nursery to Senior Secondary',
    desc: 'The anchor SchoolOS demo school. Nursery through SSS, low student-teacher ratios and termly results published to parents through the work portal.',
    rating: 4.7,
    reviews: 98,
    emoji: '🎓',
    gradient: 'from-indigo-700 to-brand-600',
    joined: '2023-09',
    verified: true,
    staff: 18,
    customers: 240,
    hours: '7:30 AM – 4:00 PM · Mon–Fri',
  },
  {
    id: 'org_cypress_garden',
    slug: 'cypress-garden-school',
    name: 'Cypress Garden School',
    category: 'School',
    os: 'schoolos',
    osLabel: 'SchoolOS',
    area: 'Ekorinim',
    address: '2 Cypress Close, Ekorinim, Calabar',
    tagline: 'Small classes, steady routines',
    desc: 'A garden school in Ekorinim with capped class sizes, feeding programme and Saturday tours.',
    rating: 4.5,
    reviews: 61,
    emoji: '🌳',
    gradient: 'from-green-700 to-emerald-500',
    joined: '2024-01',
    verified: true,
    staff: 12,
    customers: 150,
    hours: '8:00 AM – 4:00 PM · Mon–Fri',
  },
  {
    id: 'org_shepherds_care',
    slug: "shepherds-care-clinic",
    name: "Shepherd's Care Clinic",
    category: 'Healthcare',
    os: null,
    osLabel: 'City Care',
    area: 'Ekorinim',
    address: '9 Ekorinim Road, Calabar',
    tagline: 'Family medicine that keeps neighbourhood hours',
    desc: 'GP and skin clinics that stay open late, same-day slots most evenings and referrals into City Care.',
    rating: 4.7,
    reviews: 188,
    emoji: '🩺',
    gradient: 'from-rose-700 to-pink-500',
    joined: '2024-04',
    verified: true,
    staff: 4,
    customers: 2600,
    hours: '8:00 AM – 8:00 PM · Mon–Sat',
  },
  {
    id: 'org_crossriver_homes',
    slug: 'crossriver-homes',
    name: 'CrossRiver Homes & Estates',
    category: 'Property',
    os: null,
    osLabel: 'CityHouse',
    area: 'Marian Road',
    address: 'Canal Lane, Marian Road, Calabar',
    tagline: 'Listings, viewings & CityPay deposits',
    desc: 'Property management and listings across Calabar. Viewing requests, deposits and 12-month instalments all move through CityPay.',
    rating: 4.6,
    reviews: 204,
    emoji: '🏠',
    gradient: 'from-amber-700 to-orange-500',
    joined: '2023-11',
    verified: true,
    staff: 6,
    customers: 880,
    hours: '8:00 AM – 6:00 PM · Mon–Sat',
  },
  {
    id: 'org_creative_hub',
    slug: 'calabar-creative-hub',
    name: 'Calabar Creative Hub',
    category: 'Co-working & Media',
    os: null,
    osLabel: 'City Community',
    area: 'Big Qua Town',
    address: '1 Studio Close, Big Qua Town, Calabar',
    tagline: 'Desks, studios & the gig bulletin',
    desc: 'Co-working desks, rehearsal studios and the city gig board. Where the job feed and the community it posts from come together.',
    rating: 4.5,
    reviews: 87,
    emoji: '🎨',
    gradient: 'from-fuchsia-700 to-brand-500',
    joined: '2024-07',
    verified: true,
    staff: 3,
    customers: 620,
    hours: '8:00 AM – 10:00 PM · Daily',
  },
];

export function getOrg(slug: string): UniverseOrg | undefined {
  return ORGS.find((o) => o.slug === slug);
}

export const SHOPOS_ORGS = ORGS.filter((o) => o.os === 'shopos');
export const SERVICEOS_ORGS = ORGS.filter((o) => o.os === 'serviceos');
export const SCHOOLOS_ORGS = ORGS.filter((o) => o.os === 'schoolos');

export interface CommunityPost {
  id: string;
  author: string;
  time: string;
  body: string;
  likes: number;
}

export interface Community {
  id: string;
  name: string;
  area: string;
  members: number;
  about: string;
  admin: string;
  established: string;
  posts: CommunityPost[];
}

export const COMMUNITIES: Community[] = [
  {
    id: 'c1',
    name: 'State Housing Estate Neighbours',
    area: 'State Housing Estate',
    members: 1284,
    about: 'The compound WhatsApp that became a ward council. Power updates, keke share, market runs and the occasional lost hen.',
    admin: 'David Ekong',
    established: '2021-06',
    posts: [
      { id: 'c1p1', author: 'Comfort Udofia', time: '2h ago', body: 'PHEDC just restored the S.H.E. line. Backup not needed tonight — feed report confirmed.', likes: 41 },
      { id: 'c1p2', author: 'Effiong Bassey', time: '5h ago', body: 'Sharing one CityKeke run to Watt Market at 8 AM. Two seats available, 60/40 on the fare.', likes: 18 },
      { id: 'c1p3', author: 'Whitney Atim', time: '1d ago', body: 'Found a pair of men’s glasses at the junction mini-mart. Handed to the counter.', likes: 32 },
      { id: 'c1p4', author: 'Nkoyo Effiom', time: '2d ago', body: 'Farm-fresh vegetables drop at the gate every Tuesday from Big Qua Town. First come, first weighed.', likes: 63 },
    ],
  },
  {
    id: 'c2',
    name: 'Ekorinim Garden Circle',
    area: 'Ekorinim',
    members: 486,
    about: 'Residents of the garden flats and the coffee-house side of Ekorinim. Move notices, plant swaps and studio gossip.',
    admin: 'Anita Edem',
    established: '2022-01',
    posts: [
      { id: 'c2p1', author: 'Basil Oko', time: '1h ago', body: 'Carnival rehearsal drums carry all the way up Ekorinim Road tonight — bring earplugs, free show otherwise.', likes: 27 },
      { id: 'c2p2', author: 'Mercy Eyo', time: '8h ago', body: 'The garden flat at Ekorinim Close has a room for a quiet professional. Inbox me, no agents.', likes: 19 },
      { id: 'c2p3', author: 'Kufre Ene', time: '1d ago', body: 'AC gas refill running at Mike’s this weekend, 20% off for circle members. Booked through CityOS.', likes: 74 },
    ],
  },
  {
    id: 'c3',
    name: 'Calabar Creatives',
    area: 'Big Qua Town',
    members: 932,
    about: 'Photographers, bands, tailors and storytellers around the Creative Hub. Gig swaps, gear hires and the monthly open mic.',
    admin: 'Imoh Daniel',
    established: '2023-03',
    posts: [
      { id: 'c3p1', author: 'Imoh Daniel', time: '3h ago', body: 'Open mic this Friday at the Hub — 5-minute slots, sign up at the desk from 4 PM.', likes: 58 },
      { id: 'c3p2', author: 'Tracy Bassey', time: '6h ago', body: 'Need a second shooter for a Saturday wedding at Tinapa. Rates standard, gallery split 50/50.', likes: 25 },
      { id: 'c3p3', author: 'Samuel Edem', time: '1d ago', body: 'Photography batch at Calabar Moments completed overnight — 240 retouched frames out for delivery.', likes: 45 },
    ],
  },
];

export function getCommunity(id: string): Community | undefined {
  return COMMUNITIES.find((c) => c.id === id);
}

export interface Experience {
  id: string;
  label: string;
  sub: string;
  emoji: string;
  os?: 'shopos' | 'serviceos' | 'schoolos';
  slug?: string;
  href: string;
}

export const EXPERIENCES: Experience[] = [
  { id: 'resident', label: 'City Resident', sub: 'Home, map, create & city services', emoji: '🏙️', href: '/' },
  {
    id: 'org_freshmart_calabar',
    label: 'FreshMart · Shop Owner',
    sub: 'ShopOS operational workspace',
    emoji: '🧺',
    os: 'shopos',
    slug: 'freshmart-calabar',
    href: '/workspaces/shopos/freshmart-calabar',
  },
  {
    id: 'org_mikes_ac',
    label: "Mike's AC · Service Provider",
    sub: 'ServiceOS operational workspace',
    emoji: '❄️',
    os: 'serviceos',
    slug: 'mikes-ac-services',
    href: '/workspaces/serviceos/mikes-ac-services',
  },
  {
    id: 'org_hope_academy',
    label: 'Hope Academy · School Admin',
    sub: 'SchoolOS operational workspace',
    emoji: '🎓',
    os: 'schoolos',
    slug: 'hope-academy',
    href: '/workspaces/schoolos/hope-academy',
  },
];

export function getExperience(id: string): Experience | undefined {
  return EXPERIENCES.find((e) => e.id === id);
}