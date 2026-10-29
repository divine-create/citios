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

/**
 * Formats Nigerian phone numbers into clean readable spacing (e.g. 0803 708 7777).
 */
export function formatDisplayPhone(rawPhone?: any): string {
  if (!rawPhone) return '';
  const str = String(rawPhone).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length >= 13) {
    const local = '0' + digits.slice(3);
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return str;
}

/**
 * Checks whether a business is currently open in West Africa Time (WAT, UTC+1).
 */
export function checkIsOpenNow(rawHours?: any): { isOpen: boolean; label: string } {
  if (!rawHours) return { isOpen: false, label: 'Hours not listed' };
  const hoursStr = typeof rawHours === 'string'
    ? rawHours
    : (typeof rawHours === 'object' && rawHours !== null && 'open' in rawHours && 'close' in rawHours)
    ? `${rawHours.open} - ${rawHours.close}`
    : String(rawHours);

  const lower = hoursStr.toLowerCase();
  if (lower.includes('24/7') || lower.includes('open 24 hours') || lower.includes('24 hours')) {
    return { isOpen: true, label: 'Open 24/7' };
  }

  // Get current day of week and hour in West Africa Time (WAT, UTC+1)
  const now = new Date();
  const utcHours = now.getUTCHours();
  const watHour = (utcHours + 1) % 24;
  const watDay = (utcHours + 1 >= 24 ? now.getUTCDay() + 1 : now.getUTCDay()) % 7; // 0 = Sunday

  const isSunday = watDay === 0;
  if (isSunday && !lower.includes('sun') && !lower.includes('everyday') && !lower.includes('daily')) {
    return { isOpen: false, label: 'Closed on Sundays' };
  }

  if (lower.includes('10:00 pm') || lower.includes('22:00')) {
    const isOpen = watHour >= 7 && watHour < 22;
    return { isOpen, label: isOpen ? 'Open Now' : 'Closed' };
  }
  if (lower.includes('9:00 pm') || lower.includes('9:30 pm')) {
    const isOpen = watHour >= 8 && watHour < 21;
    return { isOpen, label: isOpen ? 'Open Now' : 'Closed' };
  }

  const isOpen = watHour >= 8 && watHour < 18;
  return { isOpen, label: isOpen ? 'Open Now' : 'Closed' };
}

