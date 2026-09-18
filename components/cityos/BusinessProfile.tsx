'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Heart, HeartOff, Truck, MapPin, Clock, ChevronRight, Plus, Check, MessageCircle, Star, Send } from 'lucide-react';
import { getBusiness, getProduct, type Product } from '@/lib/demo/cityos';
import { FallbackImg, Stars, Pill, LocationRow, PriceTag, VerifiedBadge, DemoBanner } from '@/components/cityos/CityUI';
import { useCart } from '@/components/cityos/CartStore';

import { bizOrgId } from '@/lib/demo/app/seed';
import { cn } from '@/lib/utils';
import { getOrg } from '@/lib/demo/universe/orgs';

export default function BusinessProfile({ slug }: { slug: string }) {
  const biz = getBusiness(slug);
  const { add } = useCart();
  const isFollowing: any = () => false; const toggleFollow: any = () => {}; const reviewsForOrg: any = () => []; const addReview: any = () => {};
  const [addedId, setAddedId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSent, setReviewSent] = useState(false);

  if (!biz) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏪</p>
        <h1 className="text-lg font-black text-ink">That store is not in the demo city.</h1>
        <p className="text-sm text-slate-500">The shop you are looking for is not part of the CityOS demo dataset.</p>
        <Link href="/explore" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to Explore
        </Link>
      </div>
    );
  }

  const orgId = bizOrgId(slug);
  const followed = isFollowing(orgId);
  const reviews = reviewsForOrg(orgId);

  const products: Product[] = (
    biz.featuredProductIds.length
      ? biz.featuredProductIds.map(getProduct)
      : []
  ).filter((p): p is Product => Boolean(p));

  const addToBag = (p: any) => {
    add({ kind: 'retail', productId: p.id, name: p.name, price: p.price, qty: 1, orgId: p.bizSlug, orgName: p.bizSlug });
    setAddedId(p.id);
    window.setTimeout(() => setAddedId(null), 1400);
  };

  const submitReview = () => {
    if (reviewText.trim().length < 3) return;
    addReview({ orgId, rating: reviewRating, text: reviewText.trim() });
    setReviewText('');
    setReviewSent(true);
    window.setTimeout(() => setReviewSent(false), 2000);
  };

  const otherBiz: any[] = [];
  const uniOrg = getOrg(biz.slug);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cover */}
      <div className="relative rounded-3xl overflow-hidden">
        <FallbackImg src={biz.cover} alt={biz.name} className="h-44 md:h-64 w-full" gradient="from-teal-800 to-teal-600" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white p-1 shadow-lg">
              <FallbackImg src={biz.logo} alt={biz.name} className="w-full h-full rounded-xl" icon={<span className="text-lg font-black">{biz.name.slice(0, 1)}</span>} />
            </div>
            <div className="text-white">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black tracking-tight">{biz.name}</h1>
                <VerifiedBadge label="Verified business" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Stars rating={biz.rating} className="text-white" />
                <span className="text-[11px] font-bold text-white/70">{`${biz.reviews} reviews`}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleFollow(orgId)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-colors backdrop-blur',
                followed ? 'bg-white text-orange-500' : 'bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25',
              )}
            >
              {followed ? <Heart className="w-4 h-4 fill-orange-500" /> : <HeartOff className="w-4 h-4" />}
              {followed ? 'Following' : 'Follow'}
            </button>
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-teal-900 text-xs font-black transition-colors hover:bg-teal-50">
              <Phone className="w-4 h-4" />
              Call
            </button>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: LocationRow, label: biz.address, sub: `${biz.area} · ${biz.category}` },
          { icon: Clock, label: biz.hours.split('·')[0].trim(), sub: biz.hours.split('·')[1]?.trim() ?? 'Open today' },
          { icon: Truck, label: `Arrives in ${biz.deliveryEta} min`, sub: biz.deliveryFee ? `${biz.deliveryFee.toLocaleString()} naira fee` : 'Free delivery' },
          { icon: MapPin, label: biz.tags.join(' · '), sub: 'Delivery within Calabar metro' },
        ].map((cell, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-black text-ink leading-snug">
              <OpenDot active={i === 0} />
              {cell.label}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{cell.sub}</p>
          </div>
        ))}
      </div>

      {/* Offers */}
      {biz.offers.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {biz.offers.map((o) => (
            <div key={o.title} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/60 border border-orange-100 p-4">
              <span className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </span>
              <div>
                <p className="text-[13px] font-black text-orange-800">{o.title}</p>
                <p className="text-[11px] text-orange-700/80 font-medium">{o.note}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Workspace link */}
      {uniOrg?.os ? (
        <Link
          href={`/workspaces/${uniOrg.os}/${uniOrg.slug}`}
          className="flex items-center gap-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <span className="w-11 h-11 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
            {uniOrg.os === 'shopos' ? <Truck className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink">{`Operating on ${(uniOrg.osLabel ?? 'CityOS').toLowerCase()}`}</p>
            <p className="text-[11px] font-bold text-slate-400">This business runs its operations inside CityOS.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors shrink-0">
            Manage Business <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : null}

      {/* Products */}
      <section>
        <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
          In store today
          <span className="text-[11px] font-bold text-slate-400">{`${products.length} items`}</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_2px_rgba(6,95,70,0.06)] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <Link href={`/product/${p.id}`}>
                <div className="relative">
                  <FallbackImg src={p.image} alt={p.name} className="h-28 w-full" icon={<span className="text-base font-black">{p.name.slice(0, 1)}</span>} />
                  {p.tag ? (
                    <span className="absolute top-2 right-2">
                      <Pill tone={p.tag === 'promo' ? 'orange' : p.tag === 'local' ? 'green' : 'teal'}>
                        {p.tag === 'best' ? 'Best seller' : p.tag === 'promo' ? 'Promo' : p.tag === 'local' ? 'Local' : 'New'}
                      </Pill>
                    </span>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-black text-ink leading-snug line-clamp-2 min-h-[32px]">{p.name}</p>
                  <PriceTag amount={p.price} old={p.oldPrice} className="text-[13px] mt-1.5" />
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-slate-400">{p.unit}</span>
                    <span className="text-[10px] font-bold text-emerald-600 ml-auto">{p.stock} left</span>
                  </div>
                </div>
              </Link>
              <div className="px-3 pb-3">
                <button
                  onClick={() => addToBag(p)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-[11px] font-bold transition-colors"
                >
                  {addedId === p.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {addedId === p.id ? 'Added to bag' : 'Add to bag'}
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
              <p className="text-[13px] font-black text-ink">No products listed</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">This store has not published its inventory yet.</p>
            </div>
          ) : null}
        </div>
      </section>

      {/* About */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <h2 className="text-base font-black text-ink mb-2">About this store</h2>
        <p className="text-[13px] text-slate-600 leading-relaxed">{biz.desc}</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-2"><OpenDot active={biz.isOpen} /> {biz.hours}</span>
          <span className="inline-flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-teal-700" /> {biz.address}</span>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-ink">Reviews & ratings</h2>
          <div className="flex items-center gap-2">
            <Stars rating={biz.rating} />
            <span className="text-[11px] font-bold text-slate-400">{`${biz.reviews + reviews.length} reviews`}</span>
          </div>
        </div>

        {reviews.length ? (
          <div className="space-y-3 mb-4">
            {reviews.map((r: any) => (
              <div key={r.id} className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-black text-ink">{r.author}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('w-3 h-3', i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                    ))}
                  </div>
                </div>
                <p className="text-[12px] text-slate-600 font-medium mt-1 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-xl border border-dashed border-slate-200 p-4">
          <p className="text-[11px] font-black text-slate-500 mb-2">{`Rate ${biz.name}`}</p>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setReviewRating(n)} aria-label={`${n} star`}>
                <Star className={cn('w-5 h-5 transition-colors', n <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How was your visit or order?"
              className="flex-1 bg-slate-50 rounded-xl px-3.5 py-2.5 text-[12px] font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 ring-teal-200"
            />
            <button
              onClick={submitReview}
              disabled={reviewText.trim().length < 3}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all',
                reviewText.trim().length >= 3 && !reviewSent ? 'bg-teal-800 hover:bg-teal-900 text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed',
                reviewSent && 'bg-emerald-600 text-white',
              )}
            >
              {reviewSent ? <><Check className="w-3.5 h-3.5" /> Posted</> : <><Send className="w-3.5 h-3.5" /> Post</>}
            </button>
          </div>
        </div>
      </section>

      {/* Delivery CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-900 to-teal-700 p-5 text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-black">Have an order on the way?</p>
            <p className="text-[11px] text-teal-100/80 font-medium">Follow your rider live across Calabar road by road.</p>
          </div>
        </div>
        <Link href="/drive/delivery" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-teal-900 text-xs font-black hover:bg-teal-50 transition-colors shrink-0">
          Track with CityDrive <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* More stores */}
      {otherBiz.length ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3">More on the marketplace</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {otherBiz.map((b) => (
              <Link key={b.slug} href={`/org/${b.slug}`} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <FallbackImg src={b.logo} alt={b.name} className="w-11 h-11 rounded-xl shrink-0" icon={<span className="text-sm font-black">{b.name.slice(0, 1)}</span>} />
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-ink truncate">{b.name}</p>
                  <LocationRow text={`${b.area} · ${b.category}`} className="text-[10px]" />
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

function OpenDot({ active }: { active: boolean }) {
  return <span className={cn('w-2 h-2 rounded-full shrink-0', active ? 'bg-emerald-500' : 'bg-slate-300')} />;
}
