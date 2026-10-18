import { Suspense } from 'react';
import CreateEventForm from '@/components/cityos/CreateEventForm';

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm font-bold text-slate-400">
          Loading event creator...
        </div>
      }
    >
      <CreateEventForm />
    </Suspense>
  );
}
