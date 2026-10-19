import Link from 'next/link';
import { ArrowRight, Briefcase, BadgeCheck, Users, CalendarDays, ClipboardList, CheckCircle2, ShieldCheck, ArrowUpRight, Star, Clock, Phone, MessageSquare } from 'lucide-react';
import { getCanonicalOrganization } from '@/app/actions/org';
import { formatMoney } from '@/lib/format';
import { getCurrentCity } from '@/lib/city';
import { Pill, Stars, LocationRow, VerifiedBadge, FallbackImg } from '@/components/cityos/CityUI';
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
  const session = await getServerSession(authOptions);
  let isManager = false;
  let userRole = 'Member';

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

  const [workspaceUrl, reviewsBundle] = await Promise.all([
    getWorkspaceUrlForOrg(org.id, org.type),
    getOrganizationReviews(org.id),
  ]);

  const { capabilities, jobsData, eventsData, servicesData, productsData, menuData, locations } = org;
  
  const phoneCp = org.contactPoints?.find((cp: any) => cp.type === 'PHONE')?.value || null;
  const whatsappCp = org.contactPoints?.find((cp: any) => cp.type === 'WHATSAPP')?.value || null;

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
  const hours: string | null = org.metadata?.workingHours || org.metadata?.hours || null;
  const category = org.type || 'Business';
  const osLabel = capabilities.retail ? 'ShopOS' : capabilities.restaurant ? 'RestaurantOS' : capabilities.school ? 'SchoolOS' : capabilities.services ? 'ServiceOS' : '9jaLive';
  const osPath = osLabel.toLowerCase();

  const factCells: { label: string; sub: string }[] = [
    { label: addressStr || city?.name || 'Local Store', sub: `${(org as any).storeCategory || category}` },
  ];
  if (hours) {
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

      {/* Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-7 md:p-9`}>
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            {org.coverImage || org.logoAssetId ? (
              <FallbackImg
                src={org.coverImage || (org.logoAssetId?.startsWith('http') || org.logoAssetId?.startsWith('/') ? org.logoAssetId : `/api/assets/${org.logoAssetId}`)}
                alt={org.name}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-white ring-1 ring-white/20"
                icon={<span className="text-3xl">{emoji}</span>}
              />
            ) : (
              <span className="w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center text-3xl shrink-0">
                {emoji}
              </span>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight">{org.name}</h1>
              </div>
              <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-white/75">{org.isVerified ? 'Verified Org' : org.isClaimed ? 'Registered Org' : 'Directory Listing'}</span>
                {reviewsBundle.distribution.averageRating && (
                  <a
                    href="#reviews"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[11px] font-black transition-colors"
                  >
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>{reviewsBundle.distribution.averageRating.toFixed(1)}</span>
                    <span className="text-white/75 font-bold">
                      ({reviewsBundle.distribution.totalReviews})
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {whatsappCp && (
              <a
                href={`https://wa.me/${whatsappCp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${org.name}, I found your business on 9jaLive and would like to make an enquiry.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}
            {phoneCp && (
              <a
                href={`tel:${phoneCp}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-black shadow-sm transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Call
              </a>
            )}
            <a
              href="#reviews"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f43939] hover:bg-[#d92b2b] text-white text-xs font-black shadow-sm transition-colors"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              Write a Review
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
      {shop && shop.products.length > 0 ? (
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

