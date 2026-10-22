export type NetworkDispatchPolicy = 'CITYOS_ONLY' | 'OPEN_NETWORK';
export type ProviderCategory = 'CITYOS_FLEET' | 'INDEPENDENT_RIDER' | 'THIRD_PARTY_PARTNER';

/**
 * Server-side source of truth for CityDrive Network provider eligibility policy.
 * Defaults strictly to 'CITYOS_ONLY'. Fails closed on missing, malformed, or unrecognized values.
 * Clients cannot override this policy.
 */
export function getNetworkDispatchPolicy(): NetworkDispatchPolicy {
  const raw = (process.env.CITYDRIVE_NETWORK_POLICY || '').trim().toUpperCase();
  if (raw === 'OPEN_NETWORK') {
    return 'OPEN_NETWORK';
  }
  return 'CITYOS_ONLY';
}

/**
 * Parses and returns the explicit, server-controlled allowlist of CityOS platform fleet organization IDs.
 * Returns an empty array if unconfigured, empty, or whitespace. Fails closed.
 */
export function getCityOSFleetOrgIds(): string[] {
  const raw = process.env.CITYOS_FLEET_ORG_IDS;
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Determines whether a provider organization is an authorized CityOS-operated platform fleet.
 * STRICT SECURITY REQUIREMENT:
 * 1. Only explicitly authorized platform fleet organization IDs in CITYOS_FLEET_ORG_IDS are eligible.
 * 2. Organization names or naming conventions NEVER establish platform fleet ownership.
 * 3. Missing, empty, or malformed allowlists fail closed (returns false).
 */
export function isCityOSPlatformFleet(providerId: string): boolean {
  if (!providerId || typeof providerId !== 'string') return false;
  const allowlist = getCityOSFleetOrgIds();
  return allowlist.includes(providerId.trim());
}

/**
 * Classifies a provider into its canonical operational category.
 * Platform fleet classification strictly requires the explicit allowlist.
 */
export function getProviderCategory(provider: { id: string; name?: string; type?: string }): ProviderCategory {
  if (isCityOSPlatformFleet(provider.id)) {
    return 'CITYOS_FLEET';
  }
  const name = provider.name || '';
  if (
    name.toLowerCase().includes('independent') ||
    name.toLowerCase().includes('gig') ||
    name.toLowerCase().includes('freelance')
  ) {
    return 'INDEPENDENT_RIDER';
  }
  return 'THIRD_PARTY_PARTNER';
}
