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
