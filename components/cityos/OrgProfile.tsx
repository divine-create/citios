import Link from 'next/link';
import { ArrowRight, Briefcase, BadgeCheck, Users, CalendarDays, ClipboardList, CheckCircle2, ShieldCheck, ArrowUpRight, Star, Clock, Phone, MessageSquare } from 'lucide-react';
import { getCanonicalOrganization } from '@/app/actions/org';
import { formatMoney } from '@/lib/format';
import { getCurrentCity } from '@/lib/city';
import { Pill, Stars, LocationRow, VerifiedBadge, FallbackImg } from '@/components/cityos/CityUI';
import { formatDisplayPhone, checkIsOpenNow, resolveCalabarZone } from '@/lib/directory-constants';
import { cn, getTwoLetterInitials, getAvatarGradient } from '@/lib/utils';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import ClientProductList from '@/components/cityos/ClientProductList';
import CityMismatchChip from '@/components/cityos/CityMismatchChip';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/src/prisma/db';
import { getWorkspaceUrlForOrg } from '@/lib/actions/business';
import EnquiryModal from '@/components/cityos/EnquiryModal';
import BusinessReviewsSection from '@/components/cityos/BusinessReviewsSection';
import { getOrganizationReviews } from '@/lib/actions/reviews';
import { buildWhatsAppServiceUrl } from '@/lib/whatsapp';

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

  // Check if current user is an owner/member of this organization
  let session = null;
  let isManager = false;
  let userRole = 'Member';

  try {
    session = await getServerSession(authOptions);
    if (session?.user?.personId) {
      const membership = await db.orm.public.Membership.where({
        organizationId: org.id,
        personId: session.user.personId,
      }).all().first();

      if (membership) {
        const roles = await db.orm.public.MembershipRole.where({ membershipId: membership.id }).all();
        userRole = roles[0]?.role || 'Member';
        isManager = true;
      }
    }
  } catch (err) {
    console.error('Non-fatal error resolving session membership:', err);
  }

  let workspaceUrl = `/workspaces/shopos/${org.id}`;
  let reviewsBundle: any = {
    reviews: [],
    distribution: { averageRating: null, totalReviews: 0, counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    myReview: null,
  };

  try {
    const [wsUrl, revs] = await Promise.all([
      getWorkspaceUrlForOrg(org.id, org.type).catch(() => `/workspaces/shopos/${org.id}`),
      getOrganizationReviews(org.id).catch(() => null),
    ]);
    if (wsUrl) workspaceUrl = wsUrl;
    if (revs) reviewsBundle = revs;
  } catch (err) {
    console.error('Non-fatal error fetching workspace or reviews bundle:', err);
  }

  const { capabilities, jobsData, eventsData, servicesData, productsData, menuData, locations } = org;
  
  const rawPhoneCp = org.contactPoints?.find((cp: any) => cp.type === 'PHONE')?.value || org.metadata?.phone || null;
  const rawWaCp = org.contactPoints?.find((cp: any) => cp.type === 'WHATSAPP')?.value || org.metadata?.whatsapp || (rawPhoneCp ? rawPhoneCp : null);
  const phoneCp = rawPhoneCp ? String(rawPhoneCp).trim() : null;
  const whatsappCp = rawWaCp ? String(rawWaCp).trim() : null;

  const shop = capabilities.retail ? { products: productsData } : undefined;
  const restaurant = capabilities.restaurant ? { menu: menuData } : undefined;
  const svc = capabilities.services ? { services: servicesData } : undefined;
  const school = capabilities.school ? { classes: [], teachers: [], admissions: [] } : undefined;
  const jobs = jobsData || [];
  
  const gradient = 'from-teal-600 to-teal-800';
  const emoji = '🏢';
  const city = await getCurrentCity();
  const fmt = (a: number) => formatMoney(a, city?.currency ?? 'NGN');
  const addressStr = org.address || locations?.[0]?.address || '';
  const rawHours = org.metadata?.workingHours || org.metadata?.hours || null;
  const hours: string | null = typeof rawHours === 'string'
    ? rawHours
    : (rawHours && typeof rawHours === 'object' && 'open' in rawHours && 'close' in rawHours)
    ? `${rawHours.open} - ${rawHours.close}`
    : rawHours ? String(rawHours) : null;
  const category = (org as any).storeCategory || org.type || 'Business';
  const osLabel = capabilities.retail ? 'ShopOS' : capabilities.restaurant ? 'RestaurantOS' : capabilities.school ? 'SchoolOS' : capabilities.services ? 'ServiceOS' : '9jaLive';
  const osPath = osLabel.toLowerCase();
  const canonicalZone = org.metadata?.zone || resolveCalabarZone(`${addressStr} ${org.name}`);
  const openStatus = checkIsOpenNow(hours);
  const heroGradient = getAvatarGradient(org.name);

  const factCells: { label: string; sub: string }[] = [
    { label: addressStr || city?.name || 'Local Store', sub: `${(org as any).storeCategory || category}` },
  ];
  if (hours && typeof hours === 'string') {
    factCells.push({
      label: hours.includes('·') ? hours.split('·')[0].trim() : hours,
      sub: hours.includes('·') ? hours.split('·')[1]?.trim() || 'Working Hours' : 'Working Hours',
    });
  }
  if (org.metadata?.landmark) {
    factCells.push({
      label: org.metadata.landmark,
      sub: 'Landmark / Directions',
    });
  } else if (shop && shop.products.length > 0) {
    factCells.push({
      label: 'Active Catalog',
      sub: 'In-Store Shopping',
    });
  }
  factCells.push({
    label: org.isVerified ? 'Verified Merchant' : org.isClaimed ? 'Registered Merchant' : 'Directory Listing',
    sub: `Operates on ${osLabel}`,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Management bar if acting as or managing this organization */}
      {isManager && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-xs font-black text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                You manage this page as <span className="text-teal-300 uppercase tracking-wide">{userRole}</span>
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Manage your catalog, orders, and configuration in the dedicated workspace.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={workspaceUrl}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black transition-colors shadow-sm flex items-center gap-1.5"
            >
              Open {osLabel} Workspace <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Modern High-Aesthetic Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 sm:p-8 md:p-9 border border-slate-800 shadow-xl`}>
        <div className="absolute -right-14 -top-14 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-6 justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Business Visual / Avatar */}
            {org.coverImage || org.logoAssetId ? (
              <FallbackImg
                src={org.coverImage || (org.logoAssetId?.startsWith('http') || org.logoAssetId?.startsWith('/') ? org.logoAssetId : `/api/assets/${org.logoAssetId}`)}
                alt={org.name}
                className="w-20 h-20 rounded-2xl object-cover shrink-0 bg-white ring-2 ring-white/20 shadow-lg"
                gradient={heroGradient}
              />
            ) : (
              <div
                className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 ring-2 ring-white/20 shadow-lg bg-gradient-to-br select-none',
                  heroGradient
                )}
              >
                {getTwoLetterInitials(org.name)}
              </div>
            )}
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                  {category}
                </span>
                {canonicalZone && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/30">
                    <MapPin className="w-3 h-3" />
                    {canonicalZone}
                  </span>
                )}
                {hours && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                      openStatus.isOpen ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-slate-300'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', openStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400')} />
                    {openStatus.isOpen ? 'Open Now' : 'Closed'}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{org.name}</h1>

              <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  {org.isVerified ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified Business Owner
                    </span>
                  ) : org.isClaimed ? (
                    <span className="text-teal-300">Registered Business</span>
                  ) : (
                    <span className="text-amber-300/90 font-medium">Public Directory Listing (Unclaimed)</span>
                  )}
                </span>
                {reviewsBundle?.distribution?.averageRating && (
                  <a
                    href="#reviews"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-black transition-colors"
                  >
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>{Number(reviewsBundle.distribution.averageRating).toFixed(1)}</span>
                    <span className="text-white/75 font-bold">
                      ({reviewsBundle.distribution.totalReviews ?? 0})
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Capsule */}
          <div className="flex items-center gap-2 flex-wrap">
            {phoneCp && (
              <a
                href={`tel:${phoneCp}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black shadow-md transition-all active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-slate-900" />
                Call {formatDisplayPhone(phoneCp)}
              </a>
            )}
            {whatsappCp && (
              <a
                href={`https://wa.me/${String(whatsappCp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${org.name}, I found your business on Calabar City Directory and would like to make an enquiry.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}
            {addressStr && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${org.name} ${addressStr} Calabar`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Directions
              </a>
            )}
            <a
              href="#reviews"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f43939] hover:bg-[#d92b2b] text-white text-xs font-black shadow-sm transition-colors"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              Write Review
            </a>
            <EnquiryModal
              organizationId={org.id}
              organizationName={org.name}
              userEmail={session?.user?.email || ''}
              userName={session?.user?.name || ''}
            />
            <Pill tone="blue">{osLabel}</Pill>
          </div>
        </div>
      </div>

      {/* Unclaimed Business Profile Claim CTA */}
      {!org.isClaimed && !isManager && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <span className="p-2.5 bg-amber-100 rounded-2xl text-xl shrink-0">🏢</span>
            <div>
              <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                Is this your business?
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800">
                  Unclaimed Listing
                </span>
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Verify ownership to update hours, receive customer leads directly to your email, and unlock your management dashboard.
              </p>
            </div>
          </div>
          <Link
            href={`/business/claim?orgId=${org.id}`}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-colors shrink-0 text-center shadow-sm"
          >
            Claim This Profile →
          </Link>
        </div>
      )}

      {/* City mismatch: this business may sit in a different city than the one
          being browsed — always labelled, never silently mixed. */}
      <CityMismatchChip citySlug={org.citySlug} />

      {/* Storefront Catalog First for Retail Supermarkets & Shops */}
      {shop && Array.isArray(shop.products) && shop.products.length > 0 ? (
        <ClientProductList products={shop.products} storeName={org.name} />
      ) : null}

      {/* Fact bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {factCells.map((cell, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[12px] font-black text-ink leading-snug">{cell.label}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{cell.sub}</p>
          </div>
        ))}
      </div>

      {/* About */}
      <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
        <h2 className="text-base font-black text-ink mb-2">About {org.name}</h2>
        <p className="text-[13px] text-slate-600 leading-relaxed">{org.description || `${org.name} on 9jaLive.`}</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <LocationRow text={`${addressStr}`} className="text-[11px]" />
          {org.isVerified ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified on 9jaLive
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              {org.isClaimed ? 'Registered Merchant' : 'Public Directory Listing'}
            </span>
          )}
        </div>
      </section>

      {/* Location, Hours & Landmark Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location & Directions */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-ink flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-700" />
              Address & Location
            </h2>
            {canonicalZone && (
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-100">
                {canonicalZone}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-800 font-medium leading-relaxed">
            {addressStr || 'Calabar, Cross River State'}
          </p>
          {org.metadata?.landmark && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">Landmark / Directions:</span>
              <p>{org.metadata.landmark}</p>
            </div>
          )}
          {addressStr && (
            <div className="pt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${org.name} ${addressStr} Calabar`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-900 hover:underline"
              >
                <span>Get directions on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </section>

        {/* Operating Hours */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-ink flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700" />
              Operating Hours
            </h2>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                openStatus.isOpen ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', openStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
              {openStatus.isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 font-semibold space-y-1">
            <p className="text-slate-500 text-[11px] font-medium">Standard Hours:</p>
            <p className="text-sm font-black text-slate-900">{hours || 'Mon - Sat: 8:00 AM - 6:00 PM'}</p>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Standard time in West Africa Time (WAT). Public holiday hours may vary.
          </p>
        </section>
      </div>

      {/* Services & Offerings if present in metadata */}
      {Array.isArray(org.metadata?.services) && org.metadata.services.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-3">
          <h2 className="text-base font-black text-ink flex items-center justify-between">
            Services & Specialties
            <span className="text-[11px] font-bold text-slate-400">{org.metadata.services.length} items</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {org.metadata.services.map((svc: any, idx: number) => {
              const svcLabel = typeof svc === 'string' ? svc : (svc?.name || svc?.title || String(svc));
              return (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/60"
                >
                  {svcLabel}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Photos Gallery */}
      {org.images && org.images.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-ink">Photos</h2>
            <span className="text-[11px] font-bold text-slate-400">{org.images.length} photo{org.images.length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {org.images.map((img: string, idx: number) => (
              <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                <FallbackImg src={img} alt={`${org.name} photo ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OS-specific listings */}
      {svc && svc.services.length > 0 ? (
        <section>
          <h2 className="text-base font-black text-ink mb-3 flex items-center justify-between">
            Services
            <span className="text-[11px] font-bold text-slate-400">{svc.services.length} live services</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {svc.services.map((s: any) => (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-black text-ink leading-snug">{s.name}</p>
                    <Pill tone="blue">Service</Pill>
                  </div>
                  <p className="text-[12px] text-slate-500 font-medium mt-1 line-clamp-2">{s.description || 'Service offered by this business.'}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {s.durationMinutes ? `${s.durationMinutes} mins` : 'Available on Request'}
                  </span>
                  {whatsappCp ? (
                    <a
                      href={buildWhatsAppServiceUrl({
                        phone: whatsappCp,
                        orgName: org.name,
                        serviceName: s.name,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Book on WhatsApp →
                    </a>
                  ) : null}
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

      {restaurant && restaurant.menu.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-ink">Menu</h2>
            <Link href={`/food/${org.id}`} className="text-[12px] font-bold text-teal-800 hover:underline flex items-center gap-1">
              Order Online / Full Menu <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {restaurant.menu.slice(0, 10).map((m: any) => (
              <Link
                key={m.id}
                href={`/food/item/${m.id}`}
                className="bg-white rounded-xl border border-slate-100 p-3 flex justify-between hover:border-teal-500 hover:shadow-sm transition-all group"
              >
                <div className="pr-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-black text-ink group-hover:text-teal-900">{m.name}</p>
                    {m.isAvailable === false && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-500 line-clamp-2 mt-0.5">{m.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-black text-teal-900">{fmt(m.price ?? m.basePrice ?? 0)}</p>
                  <span className="text-[11px] font-bold text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    View dish →
                  </span>
                </div>
              </Link>
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
                    <p className="text-[11px] font-bold text-slate-400 truncate">{j.type ? j.type.replace(/_/g, ' ') : j.employmentType || 'Full-Time'}</p>
                  </div>
                  <Pill tone="blue">Hiring</Pill>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-800">
                    <Briefcase className="w-3.5 h-3.5" /> {j.pay || j.salary || 'Competitive'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{j.area || 'Calabar'}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Latest Updates & Social Sync Feed */}
      {Array.isArray((org as any).postsData) && (org as any).postsData.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-100 p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-ink">Latest Updates from {org.name}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Recent announcements, promos, and social posts</p>
            </div>
            <span className="text-[11px] font-bold text-slate-400">{(org as any).postsData.length} update{(org as any).postsData.length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(org as any).postsData.map((p: any) => {
              let postMeta: any = {};
              try {
                if (p.postMetadata) postMeta = typeof p.postMetadata === 'string' ? JSON.parse(p.postMetadata) : p.postMetadata;
              } catch {}
              const isInstagram = p.linkedEntityType === 'INSTAGRAM_POST' || postMeta?.source === 'INSTAGRAM';
              return (
                <div key={p.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden flex flex-col justify-between hover:border-slate-200 transition-all">
                  <div>
                    {p.imageUrl && (
                      <div className="relative aspect-square bg-slate-100 overflow-hidden">
                        <FallbackImg src={p.imageUrl} alt={p.title || org.name} className="w-full h-full object-cover" gradient={heroGradient} />
                        {isInstagram && (
                          <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold tracking-wide">
                            Instagram
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          {p.category || 'Update'}
                        </span>
                        {p.price ? (
                          <span className="text-xs font-black text-slate-900">{fmt(Number(p.price))}</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-700 font-medium line-clamp-4 leading-relaxed whitespace-pre-line">
                        {p.content}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <Link href={`/feed/${p.id}`} className="font-bold text-teal-800 hover:underline">
                      View on City Feed →
                    </Link>
                    {postMeta?.instagramUrl && (
                      <a href={postMeta.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 inline-flex items-center gap-1">
                        <span>Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reviews & Ratings Section */}
      <BusinessReviewsSection
        organizationId={org.id}
        organizationName={org.name}
        initialReviews={reviewsBundle.reviews}
        initialDistribution={reviewsBundle.distribution}
        initialMyReview={reviewsBundle.myReview}
        isManager={isManager}
        isLoggedIn={Boolean(session?.user?.personId)}
      />

      </div>
  );
}

