import { getCurrentCity, getActiveCities } from '@/lib/city';
import ResidentShell from '@/components/shell/ResidentShell';

// Server layout: resolves the session's city (cookie -> single active city ->
// stable fallback) ONCE per request and injects it into the client shell.
// All city-scoped server actions resolve the same way server-side, so the
// client can never assert a different city.
export default async function ResidentLayout({ children }: { children: React.ReactNode }) {
  const [city, cities] = await Promise.all([getCurrentCity(), getActiveCities()]);

  return (
    <ResidentShell city={city} cities={cities}>
      {children}
    </ResidentShell>
  );
}
