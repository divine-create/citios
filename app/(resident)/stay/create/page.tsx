import { Suspense } from 'react';
import CreateStayForm from '@/components/cityos/CreateStayForm';
import { getVerticalsConfig } from '@/lib/actions/verticals-config';
import VerticalPausedNotice from '@/components/cityos/VerticalPausedNotice';

export const dynamic = 'force-dynamic';

export default async function CreateStayPage() {
  const config = await getVerticalsConfig();
  if (!config.houses) {
    return <VerticalPausedNotice verticalName="Stay" verticalId="houses" />;
  }

  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-bold text-slate-400">
          Loading stay creator...
        </div>
      }
    >
      <CreateStayForm />
    </Suspense>
  );
}
