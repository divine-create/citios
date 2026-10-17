export interface ServiceCategoryDef {
  id: string;
  slug: string;
  label: string;
  iconKey: string;
  description: string;
}

export const SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  {
    id: 'Trades & Repair',
    slug: 'trades-repair',
    label: 'Trades & Repair',
    iconKey: 'trades-repair',
    description: 'Plumbing, electrical wiring, AC servicing, carpentry, masonry & structural repairs.',
  },
  {
    id: 'Home & Cleaning',
    slug: 'home-cleaning',
    label: 'Home & Cleaning',
    iconKey: 'home-cleaning',
    description: 'Deep house cleaning, post-construction cleanup, laundry, dry cleaning & fumigation.',
  },
  {
    id: 'Tech & Solar',
    slug: 'tech-solar',
    label: 'Tech & Solar',
    iconKey: 'tech-solar',
    description: 'Solar inverter installation, battery BMS setups, CCTV surveillance & device repairs.',
  },
  {
    id: 'Automotive & Power',
    slug: 'automotive-power',
    label: 'Automotive & Power',
    iconKey: 'automotive-power',
    description: 'Generator servicing, vehicle diagnostics, mobile mechanic callouts & tyre care.',
  },
  {
    id: 'Beauty & Wellness',
    slug: 'beauty-wellness',
    label: 'Beauty & Wellness',
    iconKey: 'beauty-wellness',
    description: 'Professional barbing, salon braiding, luxury manicure/pedicure, massage & spa therapy.',
  },
  {
    id: 'Health & Care',
    slug: 'health-care',
    label: 'Health & Care',
    iconKey: 'health-care',
    description: 'Clinical home nursing, phlebotomy & lab tests, physio rehabilitation & wellness care.',
  },
];

export function getCategoryBySlug(slug?: string | null): ServiceCategoryDef | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase().trim();
  return SERVICE_CATEGORIES.find((c) => c.slug === s || c.id.toLowerCase() === s);
}

export function getCategoryById(id?: string | null): ServiceCategoryDef | undefined {
  if (!id) return undefined;
  const s = id.toLowerCase().trim();
  return SERVICE_CATEGORIES.find((c) => c.id.toLowerCase() === s || c.slug === s);
}

export function matchServiceCategory(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('solar') || t.includes('inverter') || t.includes('cctv') || t.includes('network') || t.includes('software') || t.includes('laptop') || t.includes('computer') || t.includes('battery') || t.includes('lithium') || t.includes('bms')) {
    return 'Tech & Solar';
  }
  if (/\b(car|cars|auto|automotive|mechanic|engine|tire|tires|tyre|tyres|generator|vehicle|vehicles|brake|brakes)\b/.test(t)) {
    return 'Automotive & Power';
  }
  if (t.includes('ac ') || t.includes('air condition') || t.includes('hvac') || t.includes('plumb') || t.includes('electri') || t.includes('wire') || t.includes('weld') || t.includes('carpenter') || t.includes('carpentry') || t.includes('paint') || t.includes('fix') || t.includes('roof') || t.includes('borehole') || t.includes('switch') || t.includes('meter') || t.includes('breaker') || t.includes('circuit')) {
    return 'Trades & Repair';
  }
  if (t.includes('clean') || t.includes('laundry') || t.includes('wash') || t.includes('maid') || t.includes('housekeep') || t.includes('fumigat')) {
    return 'Home & Cleaning';
  }
  if (t.includes('hair') || t.includes('barber') || t.includes('salon') || t.includes('spa') || t.includes('nail') || t.includes('massage') || t.includes('beauty') || t.includes('braid') || t.includes('scrub') || t.includes('exfoliat') || t.includes('facial') || t.includes('groom')) {
    return 'Beauty & Wellness';
  }
  if (t.includes('doctor') || t.includes('nurse') || t.includes('health') || t.includes('clinic') || t.includes('therapy') || t.includes('dental') || t.includes('teeth') || t.includes('physio') || t.includes('patient') || t.includes('care') || t.includes('medical') || t.includes('phlebotomy') || t.includes('ultrasound') || t.includes('diagnos') || t.includes('blood') || t.includes('wellness') || t.includes('panel')) {
    return 'Health & Care';
  }
  return null;
}

export function inferServiceCategory(name: string, description?: string | null): string {
  // First match against name/title
  const fromName = matchServiceCategory(name);
  if (fromName) return fromName;

  // Fallback match against combined text
  const fromFull = matchServiceCategory(`${name} ${description || ''}`);
  if (fromFull) return fromFull;

  return 'General Services';
}

