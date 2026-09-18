// Re-export the seed-owned catalog so seed scripts have one import path.
export {
  SEED_PRODUCTS as DEMO_PRODUCTS,
  SEED_TASKS as DEMO_TASKS,
  SEED_RESIDENT_ACCOUNTS as RESIDENT_ACCOUNTS,
  seedBizOrgId as bizOrgId,
  seedOrgIdForSlug as orgIdForSlug,
  seedTaskOrgId as taskOrgId,
} from './seed-catalog.js';

export function bizOrgName(_bizSlug: string): string {
  return 'CityOS Merchant';
}

