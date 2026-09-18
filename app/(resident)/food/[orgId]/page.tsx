import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UtensilsCrossed, ChefHat, Clock, MapPin, ArrowLeft, ShoppingBag } from 'lucide-react';
import { getCityFoodRestaurant } from '@/app/actions/food';
import { CityCard, FallbackImg, Stars, LocationRow, OpenBadge } from '@/components/cityos/CityUI';

interface Props {
  params: Promise<{ orgId: string }>;
}

export default async function CityFoodRestaurantPage({ params }: Props) {
  const { orgId } = await params;
  const data = await getCityFoodRestaurant(orgId);

  if (data) {
    const { restaurant, location, menuItems } = data;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Link href="/food" className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-500 hover:text-ink transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to CityFood
        </Link>

        <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 ring-1 ring-slate-900/[0.03]">
          <FallbackImg
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="h-44 w-full"
            icon={
              <span className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </span>
            }
          />
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h1 className="text-lg font-black text-ink truncate">{restaurant.name}</h1>
                <div className="flex items-center gap-2">
                  <Stars rating={restaurant.rating ?? 0} />
                  <span className="text-[11px] font-black text-slate-500">{restaurant.rating ?? 'New'}</span>
                </div>
              </div>
              <OpenBadge open={restaurant.isOpen ?? true} />
            </div>

            {restaurant.description ? (
              <p className="text-[12px] text-slate-600 font-medium leading-snug">{restaurant.description}</p>
            ) : null}

            {location ? (
              <LocationRow text={`${location.name ?? ''} · ${location.address ?? 'Calabar'}`} className="text-[11px]" />
            ) : (
              <LocationRow text="Central Calabar" className="text-[11px]" />
            )}

            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-600">
                <MapPin className="w-3 h-3 text-orange-500" />
                {restaurant.area ?? 'Calabar'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-600">
                <Clock className="w-3 h-3 text-orange-500" />
                {restaurant.deliveryEta ?? '45 min'} pickup</span>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-ink">Menu</h2>
              <p className="text-[10px] text-slate-500 font-medium">Pick dishes to add to your order</p>
            </div>
          </div>

          {menuItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
              <p className="text-sm font-bold text-slate-500">This restaurant hasn't posted a menu yet.</p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Check back soon — breakfast service starts this week.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {menuItems.map((mi) => (
                <CityCard key={mi.id} href={`/food/item/${mi.id}`} className="p-3 flex flex-col gap-2">
                  <FallbackImg
                    src={mi.imageUrl}
                    alt={mi.name}
                    className="h-24 w-full rounded-xl"
                    icon={<span className="text-sm font-black">{mi.name.slice(0, 1)}</span>}
                  />
                  <div className="space-y-0.5 flex-1">
                    <p className="text-[12px] font-black text-ink leading-snug line-clamp-1">{mi.name}</p>
                    {mi.description ? <p className="text-[11px] text-slate-500 font-medium line-clamp-2">{mi.description}</p> : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 truncate">{mi.category ?? 'Dish'}</span>
                    <span className="text-[13px] font-black text-orange-700">{fmtNaira(mi.price ?? 0)}</span>
                  </div>
                </CityCard>
              ))}
            </div>
          )}
        </section>

        {location ? (
          <section className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 p-5 text-white">
            <div className="flex items-center gap-4">
              <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-black">Our kitchen at {location.name ?? 'Calabar'}</p>
                <p className="text-[11px] text-orange-50/80 font-medium mt-0.5">{location.address}</p>
              </div>
              <Link href="/cart" className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-orange-700 text-xs font-black hover:bg-orange-50 transition-colors">
                View cart
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  notFound();
}
