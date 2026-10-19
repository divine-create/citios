// ============================================================================
// PLATFORM BRAND CONFIGURATION — 9jaLive
// ============================================================================

export const BRAND = {
  name: '9jaLive',
  shortName: '9L',
  prefix: '9ja',
  suffix: 'Live',
  aiName: 'Ask 9jaLive',
  voiceName: '9jaLive Voice',
  tagline: 'Hyperlocal Smart Commerce, Stays, Dining, Events & Living Across Nigeria',
  domain: '9jalive.online',
} as const;

export function getBrandForCountry(_country?: string | null) {
  return BRAND;
}
