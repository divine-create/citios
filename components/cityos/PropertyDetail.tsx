'use client';

import Link from 'next/link';
import { BedDouble, Bath, Building2, MapPin, ShieldCheck, ChevronRight, BadgeCheck } from 'lucide-react';
import { getProperty, fmtNaira } from '@/lib/demo/cityos';
import { FallbackImg, Pill, LocationRow, DemoBanner } from '@/components/cityos/CityUI';

export default function PropertyDetail({ id }: { id: string }) {
  const p = getProperty(id);

  if (!p) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏠</p>
        <h1 className="text-lg font-black text-ink">That listing is not in the demo city.</h1>
        <p className="text-sm text-slate-500">It may have been let or removed from the CityHouse demo dataset.</p>
        <Link href="/house" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900">Back to listings</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <nav className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
        <Link href="/house" className="hover:text-teal-800">CityHouse</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 truncate">{p.title}</span>
      </nav>

      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={p.image} alt={p.title} className="h-56 md:h-80 w-full" gradient="from-teal-800 to-teal-600" />
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
          {p.tags.map((t) => <Pill key={t} tone={t === 'Furnished' ? 'blue' : t === 'New' ? 'orange' : 'teal'}>{t}</Pill>)}
          {p.available ? <Pill tone="green">Available</Pill> : <Pill tone="red">Occupied</Pill>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
        {[
          { icon: BedDouble, label: `${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''}` },
          { icon: Bath, label: `${p.bathrooms} bathroom${p.bathrooms > 1 ? 's' : ''}` },
          { icon: Building2, label: p.type },
          { icon: MapPin, label: p.area },
          { icon: ShieldCheck, label: p.furnished ? 'Furnished' : 'Unfurnished' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col items-center gap-1.5">
            <c.icon className="w-4 h-4 text-teal-700" />
            <span className="text-[11px] font-black text-ink">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rent</p>
          <p className="text-2xl font-black text-ink mt-1">{fmtNaira(p.pricePerYear)}<span className="text-sm font-bold text-slate-400 ml-1">/ year</span></p>
          <p className="text-[12px] font-bold text-slate-400 mt-1">{`≈ ${fmtNaira(p.pricePerYear / 12)} / month`}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/house/${p.id}/pay`} className="px-5 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-black transition-colors shadow-sm inline-flex items-center gap-1.5">
            Pay via CityPay <ChevronRight className="w-4 h-4" />
          </Link>
          <button className="px-4 py-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-xs font-black hover:ring-teal-300 transition-all">
            Contact landlord
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <h2 className="text-base font-black text-ink">{p.title}</h2>
        <LocationRow text={p.address} className="text-xs" />
        <p className="text-[13px] text-slate-600 leading-relaxed">{p.desc}</p>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <BadgeCheck className="w-4 h-4 text-teal-700" />
          <p className="text-[12px] font-black text-ink">{`Listed by ${p.landlord}`}</p>
          <span className="text-[11px] font-bold text-slate-400 ml-auto">responds in &lt; 12 hrs</span>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="text-base font-black text-ink mb-3">Amenities</h2>
        <div className="flex flex-wrap gap-2">
          {p.amenities.map((a) => (
            <Pill key={a} tone="teal">{a}</Pill>
          ))}
        </div>
      </section>

      <DemoBanner />
    </div>
  );
}