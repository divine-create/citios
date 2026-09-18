import Link from 'next/link';
import { ArrowRight, Briefcase, BadgeCheck, Users, CalendarDays, ClipboardList, CheckCircle2 } from 'lucide-react';
import { getCanonicalOrganization } from '@/app/actions/org';
import { fmtNaira } from '@/lib/format';
import { Pill, Stars, LocationRow, DemoBanner, VerifiedBadge } from '@/components/cityos/CityUI';
import CityMismatchChip from '@/components/cityos/CityMismatchChip';

export default async function OrgProfile({ id }: { id: string }) {
  const org = await getCanonicalOrganization(id);

  if (!org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏢</p>
        <h1 className="text-lg font-black text-ink">That organization could not be found.</h1>
        <p className="text-sm text-slate-500">It might have been removed from the city graph.</p>
        <Link href="/explore" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Explore City
        </Link>
      </div>
    );
  }

  const { capabilities, jobsData, eventsData, servicesData, productsData, locations } = org;
  
  const shop = capabilities.retail ? { products: productsData } : undefined;
  const svc = capabilities.services ? { services: servicesData } : undefined;
  const school = capabilities.school ? { classes: [], teachers: [], admissions: [] } : undefined;
  const jobs = jobsData || [];
  
  const gradient = 'from-teal-600 to-teal-800';
  const emoji = '🏢';
  const addressStr = org.address || locations?.[0]?.address || '';
  const hours = '8:00 AM · 6:00 PM';
  const category = org.type || 'Business';
  const osLabel = capabilities.retail ? 'ShopOS' : capabilities.school ? 'SchoolOS' : capabilities.services ? 'ServiceOS' : 'CityOS';
  const osPath = osLabel.toLowerCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-7 md:p-9`}>
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-3xl shrink-0">
              {emoji}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight">{org.name}</h1>
                <VerifiedBadge label="Verified" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={5.0} />
                <span className="text-[11px] font-bold text-white/70">Verified Org</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Pill tone="blue">{osLabel}</Pill>
          </div>
        </div>
      </div>

      {/* City mismatch: this business may sit in a different city than the one
          being browsed — always labelled, never silently mixed. */}
      <CityMismatchChip citySlug={org.citySlug} />

      {/* Fact bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: addressStr, sub: `${category}` },
          { label: hours.split('·')[0].trim(), sub: hours.split('·')[1]?.trim() ?? 'Open' },
          { label: `Staffed`, sub: `Operates from ${osLabel}` },
          { label: `Active community`, sub: `CityConnect Verified` },
        ].map((cell, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[12px] font-black text-ink leading-snug">{cell.label}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{cell.sub}</p>
          </div>
        ))}
      </div>

      {/* About */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <h2 className="text-base font-black text-ink mb-2">About</h2>
        <p className="text-[13px] text-slate-600 leading-relaxed">{org.description || 'A verified organization in CityConnect.'}</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <LocationRow text={`${addressStr}`} className="text-[11px]" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified on CityOS
          </span>
        </div>
      </section>

      {/* OS-specific listings */}
      {svc && svc.services.length > 0 ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            Services
            <span className="text-[11px] font-bold text-slate-400">{svc.services.length} live services</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {svc.services.slice(0, 6).map((s: any) => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-black text-ink leading-snug">{s.name}</p>
                  <Pill tone="blue">Service</Pill>
                </div>
                <p className="text-[12px] text-slate-500 font-medium mt-1 line-clamp-2">{s.description || 'Service offered by this org.'}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] font-black text-teal-900">{`from ${fmtNaira(s.basePrice || 0)}`}</span>
                  <Stars rating={5} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {school ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            School life
            <span className="text-[11px] font-bold text-slate-400">0 classes</span>
          </h2>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
             <p className="text-[12px] text-slate-500 font-medium mt-1">School operating on SchoolOS. Enrollment open.</p>
          </div>
        </section>
      ) : null}

      {shop && shop.products.length > 0 ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            Products
            <span className="text-[11px] font-bold text-slate-400">{shop.products.length} items in store</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shop.products.slice(0, 6).map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-black text-ink leading-snug">{p.name}</p>
                  <Pill tone="blue">Product</Pill>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[12px] font-black text-teal-900">{fmtNaira(p.price || 0)}</span>
                  <span className="text-[11px] font-bold text-slate-400">{p.stockQuantity || 0} left</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Jobs */}
      {jobs.length ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            Jobs
            <Link href="/jobs" className="text-[11px] font-bold text-teal-800 hover:underline">All city jobs →</Link>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobs.slice(0, 3).map((j: any) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-ink truncate">{j.title}</p>
                    <p className="text-[11px] font-bold text-slate-400 truncate">{j.employmentType || 'Full-time'}</p>
                  </div>
                  <Pill tone="blue">Hiring</Pill>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-800">
                    <Briefcase className="w-3.5 h-3.5" /> {j.salary || 'Competitive'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Recently</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <DemoBanner />
    </div>
  );
}