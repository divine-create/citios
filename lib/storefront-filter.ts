/**
 * Utility to identify and filter out automated test or demo organizations,
 * shops, restaurants, services, and products from resident-facing storefronts.
 */

const TEST_ORG_ID_PREFIXES = [
  'org_test_',
  'org_service_',
  'org_rem_',
  'org_race_',
  'org_demote_',
  'org_conc_',
  'org_deact_',
  'org_a_',
  'org_b_',
  'org_1',
  'org_',
  'org-',
  'org2-',
  'log-',
  'org-hotel-',
  'org-food-',
];

const TEST_ORG_NAME_PATTERNS = [
  /^org$/i,
  /^org\s+org_/i,
  /^bistro\s+[0-9a-f]{5,8}$/i,
  /\s[0-9a-f]{6,8}$/i, // Trailing random hex suffix from test suites (e.g., "Victoria Grocers e03e3d", "Test Enterprise 14129a")
  /\s\d{10,}$/i, // Trailing millisecond timestamp suffix from test suites (e.g., "Payout Test Org 1792517889961")
  /\b(test|demo|mock|sample|staged|unconfigured|dummy)\s+(enterprise|org|spot|shop|store|hotel|resort|item|product|market|supermarket)\b/i,
  /\b(test|demo|mock|sample|staged|unconfigured|dummy)\b/i,
  /\b(payout|fulfillment|inventory|retail\s+concurrency)\s+test\s+org\b/i,
  /\b(remediation|demote guard|race|conc|deact)\s+org\b/i,
  /\btenant\s+organization\s+[ab]\b/i,
  /^merchant(\s+[a-z0-9]+)?$/i,
  /^other\s+merchant/i,
  /^unconfigured\s+shop/i,
  /^valid\s+supermarket/i,
  /^another\s+shop/i,
  /^corner\s+store/i,
  /^citymart\s+(express|mega|pilot)/i,
  /^lagos\s+mart/i,
  /^freshmart\s+grocery/i,
  /^logistics\s+co$/i,
  /^citylogistics\s+provider/i,
  /^calabar\s+fisherman\s+spot$/i,
  /^reject\s+me\s+shop/i,
  /^kano\s+spice\s+bazaar/i,
  /^olumo\s+(bistro|staged\s+cafe)/i,
  /^newly\s+registered\s+hotel/i,
  /^tinapa\s+lakeside\s+resort\s+test$/i,
  /^supreme\s+buka\s+test\s+spot$/i,
  /^lagos\s+pro\s+services/i,
  /^ikeja\s+quick\s+fix/i,
];

export function isTestOrDemoOrganization(org: {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
}): boolean {
  const id = (org.id || '').trim();
  const slug = (org.slug || '').trim();
  const name = (org.name || '').trim();

  if (id && TEST_ORG_ID_PREFIXES.some((prefix) => id.toLowerCase().startsWith(prefix))) {
    return true;
  }

  if (slug && TEST_ORG_ID_PREFIXES.some((prefix) => slug.toLowerCase().startsWith(prefix))) {
    return true;
  }

  if (name && TEST_ORG_NAME_PATTERNS.some((pattern) => pattern.test(name))) {
    return true;
  }

  if (slug && /\-[0-9a-f]{6,8}(\-[0-9a-f]{6,8})?$/i.test(slug) && /test|bistro|olumo|kano|reject|victoria|lagos-mart/i.test(slug)) {
    return true;
  }

  return false;
}

export function isTestOrDemoProduct(product: {
  id?: string | null;
  name?: string | null;
  organizationId?: string | null;
  storeName?: string | null;
}): boolean {
  if (product.organizationId && isTestOrDemoOrganization({ id: product.organizationId, name: product.storeName })) {
    return true;
  }
  const name = (product.name || '').trim();
  if (/^(test|demo|sample)\s+(item|product|good)/i.test(name)) {
    return true;
  }
  if (/^widget(\s+[a-z0-9]+)?$/i.test(name)) {
    return true;
  }
  if (/^standard\s+bread$/i.test(name)) {
    return true;
  }
  if (/\b(test|demo|sample|dummy|mock)\b/i.test(name)) {
    return true;
  }
  return false;
}
