export type NetworkDispatchPolicy = 'CITYOS_ONLY' | 'OPEN_NETWORK';
export type ProviderCategory = 'CITYOS_FLEET' | 'INDEPENDENT_RIDER' | 'THIRD_PARTY_PARTNER';

/**
 * Server-side source of truth for CityDrive Network provider eligibility policy.
 * Defaults strictly to 'CITYOS_ONLY'. Clients cannot override this policy.
 */
export function getNetworkDispatchPolicy(): NetworkDispatchPolicy {
  return (process.env.CITYDRIVE_NETWORK_POLICY as NetworkDispatchPolicy) || 'CITYOS_ONLY';
}

/**
 * Determines whether a provider organization is a CityOS-operated platform fleet.
 */
export function isCityOSPlatformFleet(providerId: string, orgName?: string): boolean {
  const configured = (process.env.CITYOS_FLEET_ORG_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.includes(providerId)) return true;
  if (
    orgName &&
    (orgName.toLowerCase().includes('cityos') ||
     orgName.toLowerCase().includes('citydrive fleet') ||
     orgName.toLowerCase().includes('citydrive internal') ||
     orgName.toLowerCase().includes('platform fleet'))
  ) {
    return true;
  }
  return false;
}

/**
 * Classifies a provider into its canonical operational category.
 */
export function getProviderCategory(provider: { id: string; name: string; type?: string }): ProviderCategory {
  if (isCityOSPlatformFleet(provider.id, provider.name)) {
    return 'CITYOS_FLEET';
  }
  if (
    provider.name.toLowerCase().includes('independent') ||
    provider.name.toLowerCase().includes('gig') ||
    provider.name.toLowerCase().includes('freelance')
  ) {
    return 'INDEPENDENT_RIDER';
  }
  return 'THIRD_PARTY_PARTNER';
}
