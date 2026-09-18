// Seed-owned source catalogs. These arrays exist ONLY as material for
// scripts/seed*.ts to create canonical DB records — they are not runtime
// data and are never imported by the application.

export interface SeedProduct {
  id: string;
  bizSlug: string;
  name: string;
  price: number;
  unit: string;
}

export const SEED_PRODUCTS: SeedProduct[] = [
  { id: 'q01', bizSlug: 'freshmart', name: 'Local Rice 5kg bag', price: 17500, unit: 'bag' },
  { id: 'q02', bizSlug: 'freshmart', name: 'Farm Eggs (Tray of 30)', price: 7600, unit: 'tray' },
  { id: 'q03', bizSlug: 'freshmart', name: 'Uzuza & Uda (Mixed)', price: 2800, unit: 'pack' },
  { id: 'q04', bizSlug: 'freshmart', name: 'Groundnut Oil 2L', price: 11500, unit: 'bottle' },
  { id: 'q05', bizSlug: 'freshmart', name: 'Weekend Restock Box', price: 28400, unit: 'box' },
];

export interface SeedTask {
  id: string;
  name: string;
  category: string;
  desc: string;
  from: number;
  pro: string;
}

export const SEED_TASKS: SeedTask[] = [
  { id: 't01', name: 'Leaky pipe, sink or toilet', category: 'Plumbing', desc: 'Call-out, diagnosis and a same-day fix for a leak, blocked drain or running toilet.', from: 7500, pro: 'Ubong Okon' },
  { id: 't02', name: 'Sockets, switches & rewiring', category: 'Electrical', desc: 'Dead sockets, tripping breakers or a new point for your inverter.', from: 6500, pro: 'Ekaette Bassey' },
  { id: 't03', name: 'Deep home & office cleaning', category: 'Cleaning', desc: 'Two-person crew cleaning for floors, kitchens and bathrooms.', from: 12000, pro: 'Comfort Udofia' },
  { id: 't04', name: 'AC service & gas refill', category: 'HVAC', desc: 'Filter service, coil clean and a pressure test with quoted gas refill.', from: 9000, pro: 'Chidi Eze' },
  { id: 't05', name: 'Moving / haulage runs', category: 'Logistics', desc: 'One van, careful crew, cross-town moves and market pickups.', from: 25000, pro: 'Effiong Ekanem' },
  { id: 't06', name: 'TV mount & setup', category: 'Installation', desc: 'Mount, level, hide the cables and pair everything.', from: 5000, pro: 'Pius Nyong' },
];

export function seedBizOrgId(bizSlug: string): string {
  return `org_${bizSlug.replace(/[-\s]+/g, '_')}`;
}

export function seedOrgIdForSlug(slug: string): string {
  return `org_${slug.replace(/[-\s]+/g, '_')}`;
}

const TASK_ORG_SLUG: Record<string, string> = {
  HVAC: 'mikes-ac-services',
  Cleaning: 'calabar-cleancare',
};

export function seedTaskOrgId(taskName: string): string | undefined {
  const task = SEED_TASKS.find((t) => t.name === taskName);
  return task ? seedOrgIdForSlug(TASK_ORG_SLUG[task.category]) : undefined;
}

// Seed resident accounts. Emails double as dev demo logins (password '1234'
// via the dev-only credentials provider in lib/auth.ts).
export const SEED_RESIDENT_ACCOUNTS = [
  { id: 'account_resident_david', name: 'David Ekong' },
  { id: 'account_resident_amina', name: 'Amina Ekong' },
];
