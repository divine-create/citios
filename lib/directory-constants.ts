export interface DirectoryListingItem {
  id: string; // organizationId
  listingId: string;
  name: string;
  slug: string;
  category: string;
  categoryLabel: string;
  description: string | null;
  address: string | null;
  zone: string | null;
  landmark: string | null;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  isClaimed: boolean;
  isVerified: boolean;
  services: string[];
  website?: string | null;
  coverAssetId?: string | null;
  rating?: number | null;
}

export const DIRECTORY_CATEGORIES = [
  { id: 'all', label: 'All Businesses', icon: 'Store' },
  { id: 'health', label: 'Health & Pharmacy', icon: 'Stethoscope' },
  { id: 'auto', label: 'Auto & Mechanics', icon: 'Wrench' },
  { id: 'artisans', label: 'Artisans & Technical', icon: 'Hammer' },
  { id: 'tech', label: 'Tech & Gadgets', icon: 'Smartphone' },
  { id: 'fashion', label: 'Fashion & Boutiques', icon: 'Shirt' },
  { id: 'beauty', label: 'Beauty & Barbers', icon: 'Scissors' },
  { id: 'professional', label: 'Legal & Professional', icon: 'Briefcase' },
  { id: 'printing', label: 'Printing & Media', icon: 'Printer' },
  { id: 'hardware', label: 'Electrical & Hardware', icon: 'Cpu' },
  { id: 'hotels', label: 'Hotels & Lodging', icon: 'Building2' },
  { id: 'logistics', label: 'Logistics & Dispatch', icon: 'Truck' },
  { id: 'education', label: 'Education & Training', icon: 'GraduationCap' },
  { id: 'cleaning', label: 'Cleaning & Laundry', icon: 'Sparkles' },
] as const;

export type DirectoryCategoryId = (typeof DIRECTORY_CATEGORIES)[number]['id'];

export const DIRECTORY_CATEGORY_MAP: Record<string, DirectoryCategoryId> = {
  HEALTHCARE: 'health',
  PHARMACY: 'health',
  HEALTH: 'health',
  AUTO: 'auto',
  MECHANIC: 'auto',
  ARTISANS: 'artisans',
  SERVICES: 'artisans',
  SERVICE: 'artisans',
  TECH: 'tech',
  GADGETS: 'tech',
  RETAIL: 'fashion',
  FASHION: 'fashion',
  BEAUTY: 'beauty',
  SALON: 'beauty',
  PROFESSIONAL: 'professional',
  LEGAL: 'professional',
  PRINTING: 'printing',
  MEDIA: 'printing',
  HARDWARE: 'hardware',
  ELECTRICAL: 'hardware',
  HOTEL: 'hotels',
  LODGING: 'hotels',
  LOGISTICS: 'logistics',
  TRANSPORT: 'logistics',
  SCHOOL: 'education',
  EDUCATION: 'education',
  CLEANING: 'cleaning',
  LAUNDRY: 'cleaning',
};

// Authoritative Calabar Geographic Zones (Clean Human Names)
export const CALABAR_CANONICAL_ZONES = [
  'Marian Road',
  'State Housing',
  'Watt Market / Calabar South',
  'Etta Agbor / UNICAL',
  'Murtala Mohammed Highway',
  'MCC Road / Effio-Ette',
  'Federal Housing / 8 Miles',
  'Parliamentary Road',
  'Diamond Hill / Marina',
  'Satellite Town',
  'Bogobiri',
  'Anantigha / UNICROSS',
] as const;

/**
 * Normalizes any text (address, landmark, branch) into a canonical Calabar zone.
 * Never outputs a branch name or raw organization string.
 */
export function resolveCalabarZone(rawText?: string | null): string {
  if (!rawText) return 'Calabar Municipal';
  const text = rawText.toLowerCase();

  if (text.includes('marian') || text.includes('ndidem usang iso') || text.includes('rabana') || text.includes('atekong')) {
    if (text.includes('state housing')) return 'State Housing';
    return 'Marian Road';
  }
  if (text.includes('state housing') || text.includes('housing estate')) {
    return 'State Housing';
  }
  if (text.includes('watt') || text.includes('target') || text.includes('bedwell') || text.includes('goldie') || text.includes('calabar road') || text.includes('calabar south')) {
    return 'Watt Market / Calabar South';
  }
  if (text.includes('etta agbor') || text.includes('ettagbor') || text.includes('unical') || text.includes('malabor')) {
    return 'Etta Agbor / UNICAL';
  }
  if (text.includes('mcc') || text.includes('effio-ette') || text.includes('effioette') || text.includes('channel view')) {
    return 'MCC Road / Effio-Ette';
  }
  if (text.includes('8 miles') || text.includes('eight miles') || text.includes('federal housing') || text.includes('ikot ansa') || text.includes('ikot omin')) {
    return 'Federal Housing / 8 Miles';
  }
  if (text.includes('parliamentary') || text.includes('asari eso') || text.includes('secretariat')) {
    return 'Parliamentary Road';
  }
  if (text.includes('diamond hill') || text.includes('marina') || text.includes('mary slessor') || text.includes('government house')) {
    return 'Diamond Hill / Marina';
  }
  if (text.includes('satellite town') || text.includes('ikot effanga')) {
    return 'Satellite Town';
  }
  if (text.includes('bogobiri') || text.includes('central mosque')) {
    return 'Bogobiri';
  }
  if (text.includes('anantigha') || text.includes('crutech') || text.includes('unicross') || text.includes('ekpo abasi') || text.includes('mbukpa') || text.includes('jebbs')) {
    return 'Anantigha / UNICROSS';
  }
  if (text.includes('murtala') || text.includes('highway') || text.includes('ekorinim') || text.includes('zone 6')) {
    return 'Murtala Mohammed Highway';
  }

  return 'Calabar Municipal';
}
