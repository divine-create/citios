'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

/**
 * School detail. CitySchools has no resident-facing school registry yet —
 * canonical school data lives in SchoolOS (Organization + SchoolSettings +
 * lib/actions/school.ts) but there is no shared public model wired to this
 * surface. The demo school profiles were removed with the demo purge; this
 * renders an honest "not connected" state until that wiring exists.
 */
export default function CitySchoolDetail({ slug }: { slug: string }) {
  void slug;
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 text-slate-500 flex items-center justify-center">
        <GraduationCap className="w-7 h-7" />
      </div>
      <h1 className="text-lg font-black text-ink">School profiles aren&apos;t connected yet</h1>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        CityOS can&apos;t show school profiles yet. Schools on CityOS run on SchoolOS — a public
        registry of participating schools is coming.
      </p>
      <Link href="/schools" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
        Back to schools
      </Link>
    </div>
  );
}
