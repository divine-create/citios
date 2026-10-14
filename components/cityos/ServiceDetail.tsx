'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, ArrowLeft, Loader2, CalendarClock } from 'lucide-react';
import { useMoney } from '@/components/cityos/CityProvider';
import { FallbackImg, PriceTag } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';
import { getCityServiceItem } from '@/app/actions/service';

export default function ServiceDetail({ id }: { id: string }) {
  const { fmt } = useMoney();
  const router = useRouter();
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      const prod = await getCityServiceItem(id);
      setS(prod);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 animate-in fade-in duration-500">
        <Loader2 className="w-8 h-8 animate-spin text-teal-800 opacity-20" />
      </div>
    );
  }

  if (!s) {
    return (
      <div className="max-w-md mx-auto text-center py-20 animate-in fade-in zoom-in-95 duration-500">
        <h1 className="text-xl font-black text-ink mb-2">Service not found</h1>
        <p className="text-sm text-slate-500 mb-6">This service may have been removed or is no longer active.</p>
        <button onClick={() => router.back()} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors">
          Go back
        </button>
      </div>
    );
  }

  const handleAdd = () => {
    add({
      productId: s.id,
      qty: 1, // Services usually 1, or can be multiple depending on intent
      name: s.name,
      price: s.price,
      image: s.imageAssetId,
      orgId: s.organizationId,
      orgName: s.organization?.name || 'Unknown',
      kind: 'service' as any
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="mb-4">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
      
      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
        {s.imageAssetId ? (
          <div className="aspect-video bg-slate-50 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/assets/${s.imageAssetId}`} alt={s.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-300">
            <FallbackImg alt="No Image" className="w-12 h-12 opacity-20 mb-3" />
            <p className="text-xs font-medium opacity-40 uppercase tracking-widest">No Image</p>
          </div>
        )}
        
        <div className="p-6 sm:p-8">
          <Link href={`/org/${s.organization?.slug || s.organizationId}`} className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-[11px] font-black tracking-wide uppercase text-teal-800 bg-teal-50 px-2 py-1 rounded-md">{s.organization?.name}</span>
          </Link>
          <h1 className="text-2xl font-black text-ink mt-3 leading-tight">{s.name}</h1>
          <div className="flex items-center gap-3 mt-4">
            <PriceTag amount={s.price} />
            {s.durationMinutes && (
              <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> {s.durationMinutes} min
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed mt-6">
            {s.description || 'No description provided for this service.'}
          </p>
        </div>
        
        <div className="p-6 sm:p-8 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-800 text-white text-sm font-black hover:bg-teal-900 transition-colors shadow-sm shadow-teal-900/10"
          >
            <ShoppingCart className="w-4 h-4" />
            {added ? 'Added to bag' : 'Add to bag'}
          </button>
          <p className="text-[11px] font-medium text-slate-400 text-center mt-4">
            Service pricing and availability will be confirmed at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
