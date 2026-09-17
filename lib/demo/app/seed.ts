import {
  DEMO_PRODUCTS,
  DEMO_PROPERTIES,
  DEMO_EVENTS,
  getBusiness,
  getHotel,
  getClinic,
  getSchool,
} from '@/lib/demo/cityos';
import { EXPERIENCES, getOrg, type UniverseOrg } from '@/lib/demo/universe/orgs';
import { CITY_JOBS } from '@/lib/demo/universe/jobs';
import type { DemoAccount, DemoState, SavedItem } from './types';

export const DEFAULT_ACCOUNT_ID = 'account_resident_david';

export const RESIDENT_ACCOUNTS: DemoAccount[] = [
  {
    id: 'account_resident_david',
    kind: 'resident',
    name: 'David Ekong',
    initials: 'DE',
    emoji: '🏙️',
    sub: 'Resident · State Housing Estate',
    area: 'State Housing Estate',
    tagline: 'Marian Road & Watt Market regular',
    memberSince: '2024',
    walletId: 'CCW-00912',
    referralCode: 'DAVE-CAL-01',
    stats: { orders: 23, rides: 41, payments: 87, deliveries: 18 },
  },
  {
    id: 'account_resident_amina',
    kind: 'resident',
    name: 'Amina Ekong',
    initials: 'AE',
    emoji: '🧕🏾',
    sub: 'Resident · Big Qua Town',
    area: 'Big Qua Town',
    tagline: 'Fresh-market regular · eats & events',
    memberSince: '2025',
    walletId: 'CCW-00931',
    referralCode: 'AMINA-CAL-02',
    stats: { orders: 9, rides: 14, payments: 31, deliveries: 6 },
  },
];

const STATIC_ORG_EMOJI: Record<string, string> = {
  'Grocery & Marketplace': '🧺',
  Restaurant: '🍲',
  'Fashion & Retail': '🛍️',
  Fashion: '🛍️',
  'Food & Market': '🥬',
  Groceries: '🧺',
  Cafe: '☕',
  Pharmacy: '💊',
  'HVAC & Home Services': '❄️',
  'Cleaning Services': '🧹',
  'Local Services': '🛠️',
  School: '🎓',
  Property: '🏠',
  Healthcare: '🏥',
  Electronics: '🔌',
  'Books & Prints': '📚',
  'Campus Eats': '🍟',
};

const STATIC_ORG_GRADIENT: Record<string, string> = {
  'Grocery & Marketplace': 'from-teal-800 to-emerald-600',
  Restaurant: 'from-orange-600 to-amber-500',
  'Fashion & Retail': 'from-brand-700 to-brand-500',
  Fashion: 'from-fuchsia-700 to-pink-500',
  'Food & Market': 'from-lime-700 to-green-600',
  Groceries: 'from-emerald-700 to-teal-500',
  Cafe: 'from-amber-700 to-orange-600',
  Pharmacy: 'from-blue-700 to-sky-500',
  'HVAC & Home Services': 'from-sky-700 to-cyan-500',
  'Cleaning Services': 'from-emerald-700 to-teal-500',
  'Local Services': 'from-stone-700 to-slate-600',
  School: 'from-indigo-700 to-brand-600',
  Property: 'from-amber-700 to-orange-500',
  Healthcare: 'from-rose-700 to-pink-500',
  Electronics: 'from-slate-800 to-slate-600',
  'Books & Prints': 'from-indigo-700 to-violet-600',
  'Campus Eats': 'from-yellow-700 to-amber-500',
};

export function staticOrgCard(
  id: string,
  slug: string,
  name: string,
  category: string,
  area: string,
  address: string,
  tagline: string,
  desc: string,
  rating: number,
  reviews: number,
  hours: string,
  staff = 6,
  customers = 300,
): UniverseOrg {
  return {
    id,
    slug,
    name,
    category,
    os: null,
    osLabel: 'City Merchant',
    area,
    address,
    tagline,
    desc,
    rating,
    reviews,
    emoji: STATIC_ORG_EMOJI[category] ?? '🏪',
    gradient: STATIC_ORG_GRADIENT[category] ?? 'from-slate-700 to-slate-500',
    joined: '2024-02',
    verified: true,
    staff,
    customers,
    hours,
  };
}

export function orgIdForSlug(slug: string): string {
  const org = getOrg(slug);
  if (org) return org.id;
  return `org_${slug.replace(/[-\s]+/g, '_')}`;
}

export function canonicalOrgForSlug(slug: string): UniverseOrg | undefined {
  const direct = getOrg(slug);
  if (direct) return direct;

  const biz = getBusiness(slug);
  if (biz) {
    return staticOrgCard(
      orgIdForSlug(slug),
      slug,
      biz.name,
      biz.category,
      biz.area,
      biz.address,
      biz.tagline,
      biz.desc,
      biz.rating,
      biz.reviews,
      biz.hours,
    );
  }

  const hotel = getHotel(slug);
  if (hotel) {
    return staticOrgCard(
      orgIdForSlug(slug),
      slug,
      hotel.name,
      'Hotel',
      hotel.area,
      hotel.address,
      hotel.tagline,
      hotel.desc,
      hotel.rating,
      hotel.reviews,
      '24 hours',
      12,
      900,
    );
  }

  const clinic = getClinic(slug);
  if (clinic) {
    return staticOrgCard(
      orgIdForSlug(slug),
      slug,
      clinic.name,
      'Healthcare',
      clinic.area,
      clinic.address,
      clinic.tagline,
      clinic.desc,
      clinic.rating,
      clinic.reviews,
      clinic.hours,
      8,
      600,
    );
  }

  const school = getSchool(slug);
  if (school) {
    return staticOrgCard(
      orgIdForSlug(slug),
      slug,
      school.name,
      'School',
      school.area,
      school.address,
      school.tagline,
      school.desc,
      school.rating,
      140,
      school.term,
      12,
      220,
    );
  }

  return undefined;
}

export function bizOrgId(bizSlug: string): string {
  return orgIdForSlug(bizSlug);
}

export function bizOrgName(bizSlug: string): string {
  return canonicalOrgForSlug(bizSlug)?.name ?? getBusiness(bizSlug)?.name ?? 'CityOS Merchant';
}

export function productOrgId(productId: string): string {
  const p = DEMO_PRODUCTS.find((x) => x.id === productId);
  return p ? bizOrgId(p.bizSlug) : '';
}

export function productOrgName(productId: string): string {
  const p = DEMO_PRODUCTS.find((x) => x.id === productId);
  return p ? bizOrgName(p.bizSlug) : 'CityOS Merchant';
}

const POST_AUTHOR_ORG: Record<string, string> = {
  'Watt Market Delicacies': orgIdForSlug('watt-market-delicacies'),
  'Calabar Fresh Market': orgIdForSlug('calabar-fresh'),
  'UNICAL Eats': orgIdForSlug('uni-cafe'),
  'FreshMart Calabar': orgIdForSlug('freshmart-calabar'),
  "Mama's Kitchen Calabar": orgIdForSlug('mamas-kitchen'),
  "Mike's AC Services": orgIdForSlug('mikes-ac-services'),
  'Hope Academy Calabar': orgIdForSlug('hope-academy'),
  'Calabar CleanCare': orgIdForSlug('calabar-cleancare'),
  'Urban Threads Calabar': orgIdForSlug('urban-threads-calabar'),
  'Calabar Moments Photography': orgIdForSlug('calabar-moments-photography'),
  'Calabar Creative Hub': orgIdForSlug('calabar-creative-hub'),
  'CrossRiver Homes & Estates': orgIdForSlug('crossriver-homes'),
  "Shepherd's Care Clinic": orgIdForSlug('shepherds-care-clinic'),
  'Calabar Carnival Committee': 'org_calabar_carnival',
  'City Drive Co-op': 'org_city_drive_coop',
};

export function postOrgId(author: string, isOrg?: boolean): string | undefined {
  if (!isOrg) return undefined;
  return POST_AUTHOR_ORG[author];
}

const EVENT_HOST_ORG: Record<string, string> = {
  "Mama's Kitchen Calabar": orgIdForSlug('mamas-kitchen'),
  'Urban Threads Calabar': orgIdForSlug('urban-threads-calabar'),
  'Hope Academy Calabar': orgIdForSlug('hope-academy'),
  'Calabar Creative Hub': orgIdForSlug('calabar-creative-hub'),
  "Mike's AC Services": orgIdForSlug('mikes-ac-services'),
  'FreshMart Calabar': orgIdForSlug('freshmart-calabar'),
};

export function eventOrgId(host: string): string | undefined {
  return EVENT_HOST_ORG[host];
}

export function taskOrgId(taskName: string): string | undefined {
  if (/AC|HVAC/i.test(taskName)) return orgIdForSlug('mikes-ac-services');
  if (/clean|cleaning/i.test(taskName)) return orgIdForSlug('calabar-cleancare');
  return undefined;
}

export const ORG_ACCOUNTS: DemoAccount[] = EXPERIENCES.filter((e) => e.os).map((e) => {
  const org = getOrg(e.slug!);
  return {
    id: e.id,
    kind: 'org' as const,
    name: e.label.split(' · ')[0],
    initials: (org?.name ?? e.label)
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
    emoji: e.emoji,
    sub: e.sub,
    orgId: e.id,
    experienceId: e.id,
    href: e.href,
  };
});

export const ALL_ACCOUNTS: DemoAccount[] = [...RESIDENT_ACCOUNTS, ...ORG_ACCOUNTS];

export function defaultAccount(): DemoAccount {
  return RESIDENT_ACCOUNTS[0];
}

export function getAccount(id: string): DemoAccount {
  return ALL_ACCOUNTS.find((a) => a.id === id) ?? defaultAccount();
}

export const SEED_FOLLOWS: string[] = [orgIdForSlug('freshmart-calabar')];

const SAVED_BIZ = ['calabar-fresh', 'mamas-kitchen', 'medline-pharmacy'];
const SAVED_PRODUCTS = ['q01', 'q02', 'p16', 'p08', 'p10'];
const SAVED_JOBS = CITY_JOBS.slice(0, 3).map((j) => j.id);
const SAVED_EVENTS = DEMO_EVENTS.slice(0, 3).map((e) => e.id);
const SAVED_PLACES = DEMO_PROPERTIES.filter((p) => p.featured)
  .slice(0, 2)
  .map((p) => p.id);

export function seedSaved(): SavedItem[] {
  return [
    ...SAVED_BIZ.map((id) => ({ kind: 'biz' as const, id })),
    ...SAVED_PRODUCTS.map((id) => ({ kind: 'product' as const, id })),
    ...SAVED_JOBS.map((id) => ({ kind: 'job' as const, id })),
    ...SAVED_EVENTS.map((id) => ({ kind: 'event' as const, id })),
    ...SAVED_PLACES.map((id) => ({ kind: 'place' as const, id })),
  ];
}

export function seedState(): DemoState {
  return {
    version: 1,
    activeAccountId: DEFAULT_ACCOUNT_ID,
    follows: SEED_FOLLOWS,
    likedPosts: [],
    saved: seedSaved(),
    orders: [],
    serviceRequests: [],
    jobApps: [],
    eventRegs: [],
    reviews: [],
    createdPosts: [],
  };
}