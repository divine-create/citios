'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Store, Stethoscope, BedDouble, GraduationCap, Users, Briefcase, Building2 } from 'lucide-react';
import { NEIGHBORHOODS, COMMUNITIES, getNeighborhood } from '@/lib/demo/universe/orgs';
import { SectionHead, Pill } from '@/components/cityos/CityUI';
import { cn } from '@/lib/utils';
import { getCityMapEntities } from '@/app/actions/org';

interface MapEntity {
  label: string;
  sub: string;
  href: string;
  kind: string;
}

const ROADS: [string, string][] = [
  ['marian-road', 'big-qua-town'],
  ['marian-road', 'ikot-ansa'],
  ['marian-road', 'ekorinim'],
  ['marian-road', 'parliamentary-extension'],
  ['marian-road', 'nyakasang'],
  ['marian-road', 'calabar-south'],
  ['ekorinim', 'state-housing'],
  ['ekorinim', 'watt-road'],
  ['big-qua-town', 'satellite-town'],
  ['calabar-south', 'satellite-town'],
  ['state-housing', 'eight-miles'],
  ['watt-road', 'calabar-south'],
];

const NODES: Record<string, { x: number; y: number }> = {
  'marian-road': { x: 38, y: 38 },
  'big-qua-town': { x: 20, y: 28 },
  'state-housing': { x: 82, y: 24 },
  'ikot-ansa': { x: 28, y: 52 },
  'satellite-town': { x: 14, y: 60 },
  nyakasang: { x: 50, y: 12 },
  ekorinim: { x: 60, y: 32 },
  'eight-miles': { x: 94, y: 46 },
  'parliamentary-extension': { x: 42, y: 20 },
  'calabar-south': { x: 52, y: 62 },
  'watt-road': { x: 34, y: 34 },
};

export default function CityMap() {
  const [selected, setSelected] = useState('marian-road');
  const [data, setData] = useState<{ entities: any[], jobs: any[] }>({ entities: [], jobs: [] });
  
  useEffect(() => {
    getCityMapEntities().then(setData);
  }, []);

  const area = getNeighborhood(selected) ?? NEIGHBORHOODS[0];
  
  const isMatch = (address: string, areaName: string) => {
    if (!address) return false;
    const lower = address.toLowerCase();
    const areaLower = areaName.toLowerCase();
    return lower.includes(areaLower) || lower.includes(areaLower.split(' ')[0]) || (areaName === 'Big Qua Town' && lower.includes('qua'));
  };

  const entitiesForArea = (areaName: string): MapEntity[] => {
    const out: MapEntity[] = [];
    for (const e of data.entities) {
      if (isMatch(e.address, areaName)) {
        out.push({ label: e.name, sub: e.sub, href: e.href, kind: e.kind });
      }
    }
    for (const cm of COMMUNITIES) {
       if (cm.area === areaName) out.push({ label: cm.name, sub: `${cm.members} members`, href: `/community/${cm.id}`, kind: 'community' });
    }
    return out;
  };
  
  const entities = entitiesForArea(area.name);
  const jobsHere = data.jobs.filter((j: any) => isMatch(j.area || '', area.name));

  const dotSize = (name: string) => {
    const n = entitiesForArea(name).length;
    if (n >= 4) return 4.5;
    if (n >= 2) return 3.2;
    return 2.2;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <SectionHead title="City Map" sub="A stylized demo map of Calabar — real places, database driven" />
        <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-700" /> Tap a neighbourhood</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Busy area</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> Sparse area</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* SVG map */}
        <div className="lg:col-span-3 rounded-3xl overflow-hidden border border-slate-100 bg-white p-4 md:p-6">
          <svg viewBox="0 0 100 70" className="w-full h-auto bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 rounded-2xl">
            {/* water */}
            <path d="M 88 0 C 70 20, 96 42, 84 70 L 100 70 L 100 0 Z" fill="rgba(56,189,248,0.18)" />
            <path d="M 90 6 C 74 26, 98 44, 86 66" fill="none" stroke="rgba(14,116,144,0.25)" strokeWidth="0.6" strokeDasharray="1 1.5" />
            {/* roads */}
            {ROADS.map(([a, b]) => {
              const p1 = NODES[a];
              const p2 = NODES[b];
              if (!p1 || !p2) return null;
              return <line key={a + b} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(100,116,139,0.35)" strokeWidth="0.7" />;
            })}
            {/* nodes */}
            {NEIGHBORHOODS.map((n, i) => {
              const pos = NODES[n.slug] ?? { x: 20 + i * 7, y: 20 + (i % 5) * 9 };
              const count = entitiesForArea(n.name).length;
              const active = n.slug === selected;
              const size = active ? 5 : dotSize(n.name);
              return (
                <g key={n.slug} onClick={() => setSelected(n.slug)} className="cursor-pointer">
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={active ? 5 : size}
                    fill={active ? '#0F766E' : count >= 3 ? '#0D9488' : count >= 1 ? '#14B8A6' : '#CBD5E1'}
                    stroke="#fff"
                    strokeWidth="0.8"
                    opacity={active ? 1 : 0.9}
                  />
                  {active ? (
                    <>
                      <circle cx={pos.x} cy={pos.y} r={7} fill="none" stroke="#0F766E" strokeWidth="0.4" opacity="0.4" />
                      <text x={pos.x} y={pos.y - (size / 2 + 2.4)} textAnchor="middle" fontSize="3" fontWeight="900" fill="#0F172A">
                        {n.name}
                      </text>
                    </>
                  ) : (
                    <text x={pos.x} y={pos.y - 3} textAnchor="middle" fontSize="2" fontWeight="700" fill="#64748B">
                      {n.name}
                    </text>
                  )}
                </g>
              );
            })}
            <text x={4} y={7} fontSize="3.2" fontWeight="900" fill="#0F172A" opacity="0.7">CALABAR — demo map</text>
            <text x={4} y={11} fontSize="2" fontWeight="700" fill="#64748B" opacity="0.8">Cross River · city-centre grid</text>
          </svg>
          <p className="text-[10px] text-slate-400 font-medium mt-2">
            Stylized neighbourhood layout for the demo — coordinates are illustrative, not GPS.
          </p>
        </div>

        {/* Selected area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black text-ink">{area.name}</p>
                <p className="text-[11px] font-bold text-slate-400">{area.blurb}</p>
              </div>
              <Pill tone="teal">{`${entities.length} places`}</Pill>
            </div>

            <div className="mt-4 space-y-2">
              {entities.length ? (
                entities.map((e, i) => (
                  <Link key={i} href={e.href} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-teal-50/60 transition-colors">
                    <KindIcon kind={e.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-black text-ink truncate">{e.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{e.sub}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-[11px] text-slate-400 font-medium text-center py-6">
                  Nothing demoed in {area.name} yet — residents nearby use the nearest market hub.
                </p>
              )}
            </div>

            {jobsHere.length ? (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <Briefcase className="w-3 h-3" /> {jobsHere.length} jobs nearby
                </p>
                <div className="space-y-1.5">
                  {jobsHere.slice(0, 3).map((j: any) => (
                    <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 hover:bg-teal-50 transition-colors">
                      <span className="text-[11px] font-black text-ink truncate">{j.title}</span>
                      <span className="text-[10px] font-bold text-teal-800 shrink-0 ml-2">{j.salary || j.pay || 'Competitive'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">City totals</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Organizations', value: new Set(data.entities.map(e => e.id)).size, icon: Store },
                { label: 'Open jobs', value: data.jobs.length, icon: Briefcase },
                { label: 'Communities', value: COMMUNITIES.length, icon: Users },
                { label: 'Neighbourhoods', value: NEIGHBORHOODS.length, icon: MapPin },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-slate-50 p-3 flex items-center gap-2.5">
                  <s.icon className="w-4 h-4 text-teal-700 shrink-0" />
                  <div>
                    <p className="text-base font-black text-ink leading-none">{s.value}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: string }) {
  const cls = 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0';
  const map: Record<string, [React.ComponentType<{ className?: string }>, string]> = {
    retail: [Store, 'bg-teal-50 text-teal-800'],
    restaurant: [Store, 'bg-emerald-50 text-emerald-700'],
    healthcare: [Stethoscope, 'bg-rose-50 text-rose-600'],
    hotel: [BedDouble, 'bg-sky-50 text-sky-700'],
    school: [GraduationCap, 'bg-indigo-50 text-indigo-700'],
    community: [Users, 'bg-orange-50 text-orange-600'],
    real_estate: [Building2, 'bg-amber-50 text-amber-700'],
  };
  const [Icon, tone] = map[kind] ?? [MapPin, 'bg-slate-100 text-slate-500'];
  return (
    <span className={cn(cls, tone)}>
      <Icon className="w-4 h-4" />
    </span>
  );
}