import { getCurrentCity, getActiveCities } from '@/lib/city';
import ResidentShell from '@/components/shell/ResidentShell';

// Server layout: resolves the session's city (cookie -> homeCity -> first active city)
// ONCE per request and injects it into the client shell.
// All city-scoped server actions resolve the same way server-side, so the
// client can never assert a different city.
export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  let city = null;
  let cities: Awaited<ReturnType<typeof getActiveCities>> = [];

  try {
    [city, cities] = await Promise.all([getCurrentCity(), getActiveCities()]);
  } catch (err) {
    console.error('[ResidentLayout] City resolution failed:', err);
    // Degrade gracefully — render without city context rather than crashing
  }

  return (
    <ResidentShell city={city} cities={cities}>
      {children}
    </ResidentShell>
  );
}
