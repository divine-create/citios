'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * No realtime stack exists in CityOS (no websocket/SSE/subscriptions), so the
 * resident refreshes the server-rendered delivery view on demand.
 */
export default function DeliveryRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-ink disabled:opacity-50"
    >
      <RefreshCw size={14} className={pending ? 'animate-spin' : ''} />
      {pending ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}
