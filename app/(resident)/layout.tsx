export const dynamic = 'force-dynamic';
import { getCurrentCity, getActiveCities } from '@/lib/city';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import ResidentShell from '@/components/shell/ResidentShell';

// Server layout: resolves the session's city (cookie -> homeCity -> first active city)
// and vertical configurations ONCE per request and injects it into the client shell.
export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  let city = null;
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];
  let verticalsConfig = null;

  try {
    [city, cities, verticalsConfig] = await Promise.all([
      getCurrentCity(),
      getActiveCities(),
      getVerticalsConfig(),
    ]);
  } catch (err) {
    console.error('[ResidentLayout] City resolution failed:', err);
    // Degrade gracefully — render without city context rather than crashing
  }

  return (
    <ResidentShell city={city} cities={cities} verticalsConfig={verticalsConfig}>
      {children}
    </ResidentShell>
  );
}

