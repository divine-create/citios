'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutGrid, Sun, Briefcase, GraduationCap, Repeat } from 'lucide-react';
import { EXPERIENCES, ORGS, getExperience } from '@/lib/demo/universe/orgs';
import { useExperience, EXPERIENCE_STORAGE_KEY } from '@/components/cityos/ExperienceStore';
import { SectionHead, Pill, DemoBanner } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';

export default function DemoAccess() {
  const router = useRouter();
  const { experience, setExperience } = useExperience();

  const enter = (id: string, href: string) => {
    setExperience(id);
    router.push(href);
  };

  const current = getExperience(experience);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 text-white p-7 md:p-10">
        <div className="absolute -right-14 -top-14 w-64 h-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-16 w-64 h-64 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15 text-[10px] font-black uppercase tracking-widest">
            <LayoutGrid className="w-3 h-3" /> CityOS demo access
          </span>
          <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight leading-tight">
            One city. Two front doors.
          </h1>
          <p className="mt-3 text-teal-50/85 text-sm font-medium max-w-2xl leading-relaxed">
            {`Residents get Home, Map, Create, Activity and Profile. Organizations get an operational workspace — a ShopOS, ServiceOS or SchoolOS portal for the people running the business. Enter as yourself, or step into a role.`}
          </p>

          {current ? (
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-[12px] font-bold">
              <Repeat className="w-3.5 h-3.5" />
              {`Current experience: ${current.emoji} ${current.label}`}
            </div>
          ) : null}
        </div>
      </div>

      {/* Continue as Resident */}
      <section>
        <Link
          href="/"
          onClick={() => enter('resident', '/')}
          className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-6 hover:border-teal-200 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
            🏙️
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-ink">Continue as City Resident</p>
            <p className="text-[12px] text-slate-500 font-medium mt-0.5">
              Home, Map, Create, Activity and Profile — the full everyday surface of CityOS.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-black group-hover:bg-teal-900 transition-colors">
            Enter <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </section>

      {/* Role experiences */}
      <section>
        <SectionHead
          title="Explore a demo role"
          sub="Jump into an operational workspace to see the business side of the city"
          more="Browse every org"
          moreHref="#orgs"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { exp: 'org_freshmart_calabar', icon: Sun, tone: 'from-teal-800 to-emerald-600', tag: 'ShopOS demo' },
            { exp: 'org_mikes_ac', icon: Briefcase, tone: 'from-sky-700 to-cyan-500', tag: 'ServiceOS demo' },
            { exp: 'org_hope_academy', icon: GraduationCap, tone: 'from-indigo-700 to-brand-600', tag: 'SchoolOS demo' },
          ].map(({ exp, icon: Icon, tone, tag }) => {
            const e = getExperience(exp);
            if (!e) return null;
            return (
              <button
                key={e.id}
                onClick={() => enter(e.id, e.href)}
                className={cn(
                  'group text-left bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all',
                  experience === e.id && 'ring-2 ring-teal-400 border-transparent',
                )}
              >
                <div className="flex items-start justify-between">
                  <span className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-md', tone)}>
                    {e.emoji}
                  </span>
                  <Pill tone="blue">{tag}</Pill>
                </div>
                <p className="mt-4 text-[14px] font-black text-ink">{e.label}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{e.sub}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-black text-teal-800">
                  Open workspace <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Every org */}
      <section id="orgs">
        <SectionHead title="The demo universe" sub="Fictional organizations wired across the resident app and their workspaces" />
        <div className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {ORGS.map((o) => {
            const href = o.os ? `/workspaces/${o.os}/${o.slug}` : bizHref(o);
            return (
              <Link key={o.id} href={href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-teal-50/40 transition-colors">
                <span className="text-xl">{o.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">{o.name}</p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">{`${o.category} · ${o.area}`}</p>
                </div>
                <Pill tone={o.os === 'shopos' ? 'orange' : o.os === 'serviceos' ? 'blue' : o.os === 'schoolos' ? 'teal' : 'slate'}>
                  {o.osLabel}
                </Pill>
              </Link>
            );
          })}
        </div>
      </section>

      <DemoBanner />
    </div>
  );
}

function bizHref(o: (typeof ORGS)[number]): string {
  if (o.slug === 'shepherds-care-clinic') return '/care/shepherds-care';
  if (o.slug === 'crossriver-homes') return '/house';
  if (o.slug === 'calabar-creative-hub') return '/community/c3';
  return `/biz/${o.slug}`;
}

export function ExperienceSwitcher({ className }: { className?: string }) {
  const { experience, setExperience } = useExperience();
  const current = getExperience(experience);

  const switchTo = (id: string) => {
    setExperience(id);
  };

  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 p-5', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience</p>
        <Link href="/demo/access" className="text-[11px] font-black text-teal-800 hover:underline inline-flex items-center gap-1">
          Demo access <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {EXPERIENCES.map((e) => (
          <button
            key={e.id}
            onClick={() => switchTo(e.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold ring-1 transition-all',
              experience === e.id
                ? 'bg-teal-800 text-white ring-teal-800 shadow-sm'
                : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300',
            )}
          >
            <span className="text-sm">{e.emoji}</span>
            {e.label.split(' · ')[0]}
            {experience === e.id ? null : <ArrowRight className="w-3 h-3" />}
          </button>
        ))}
      </div>
      {current ? (
        <p className="mt-2 text-[10px] font-bold text-slate-400">{`Stored under "${EXPERIENCE_STORAGE_KEY}" — demo only, cleared by anyone who pokes the console.`}</p>
      ) : null}
    </div>
  );
}