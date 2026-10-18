'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Users,
  ChevronRight,
  BadgeCheck,
  Plus,
  Globe,
  MapPin,
  ExternalLink,
  ArrowRight,
  Briefcase,
  CalendarPlus,
  X,
  Loader2,
  Building2,
  Store,
  UtensilsCrossed,
  Wrench,
  GraduationCap,
  Stethoscope,
  Truck,
} from 'lucide-react';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { cn } from '@/lib/utils';
import { createOrgJob } from '@/lib/actions/business';
import BranchManagerModal from '@/components/cityos/BranchManagerModal';
import TeamManagerModal from '@/components/cityos/TeamManagerModal';

const VERTICAL_META: Record<
  string,
  { osName: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }
> = {
  RESTAURANT: {
    osName: 'RestaurantOS',
    label: 'Launch RestaurantOS',
    desc: 'Menu, POS, kitchen display (KDS), tables, reservations & food orders',
    icon: UtensilsCrossed,
  },
  RETAIL: {
    osName: 'ShopOS',
    label: 'Launch ShopOS',
    desc: 'Catalog, inventory, POS checkout, storefront orders & sales analytics',
    icon: Store,
  },
  SERVICES: {
    osName: 'ServiceOS',
    label: 'Launch ServiceOS',
    desc: 'Service packages, bookings, client requests, quotes & technicians',
    icon: Wrench,
  },
  SCHOOL: {
    osName: 'SchoolOS',
    label: 'Launch SchoolOS',
    desc: 'Admissions, students, teachers, fee collection, registrar & academics',
    icon: GraduationCap,
  },
  HOTEL: {
    osName: 'HotelOS',
    label: 'Launch HotelOS',
    desc: 'Rooms, reservations, front desk, housekeeping, rate rules & night audit',
    icon: Building2,
  },
  LOGISTICS: {
    osName: 'LogisticsOS',
    label: 'Launch LogisticsOS',
    desc: 'Fleet management, riders, dispatch & delivery operations',
    icon: Truck,
  },
  HEALTHCARE: {
    osName: 'HealthOS',
    label: 'Launch HealthOS',
    desc: 'Appointments, practitioners, patient records & clinic operations',
    icon: Stethoscope,
  },
};

export default function BusinessDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);

  // Job form state
  const [jobTitle, setJobTitle] = useState('');
  const [jobType, setJobType] = useState('FULL_TIME');
  const [jobPay, setJobPay] = useState('');
  const [jobArea, setJobArea] = useState('');
  const [jobCategory, setJobCategory] = useState('Operations');
  const [jobDesc, setJobDesc] = useState('');
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  const { data: session } = useSession();
  const { myBusinesses, activeBusiness, switchToBusiness, openCreateModal, isLoading } = useAccountSwitcher();

  const currentBusiness = activeBusiness || myBusinesses[0] || null;

  useEffect(() => {
    if (currentBusiness) {
      setJobArea(currentBusiness.address || 'Calabar');
    }
  }, [currentBusiness]);

  useEffect(() => {
    const action = searchParams?.get('action');
    if (!action || isLoading) return;
    if (action === 'post-job') {
      if (currentBusiness) setShowJobModal(true);
      else openCreateModal();
    } else if (action === 'create-event') {
      router.replace(currentBusiness ? `/events/create?org=${currentBusiness.id}` : '/events/create');
    } else if (action === 'create-page') {
      openCreateModal();
    }
  }, [searchParams, currentBusiness, isLoading, openCreateModal, router]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setJobSubmitting(true);
    setJobError(null);
    const res = await createOrgJob({
      organizationId: currentBusiness.id,
      title: jobTitle,
      type: jobType,
      pay: jobPay,
      area: jobArea,
      category: jobCategory,
      description: jobDesc,
    });
    setJobSubmitting(false);
    if (res.error) {
      setJobError(res.error);
      return;
    }
    setShowJobModal(false);
    setJobTitle('');
    setJobPay('');
    setJobDesc('');
    router.push('/jobs');
  };

  const effectiveOrgType = currentBusiness?.type || session?.user?.memberships?.[0]?.organizationType || '';
  const OS_ROUTES: Record<string, { href: string; label: string }> = {
    RESTAURANT: {
      href: currentBusiness ? `/workspaces/restaurantos/${currentBusiness.id}/management/overview` : '/admin/restaurantos',
      label: 'Launch RestaurantOS',
    },
    RETAIL: {
      href: currentBusiness ? `/workspaces/shopos/${currentBusiness.id}` : '/admin/grocery',
      label: 'Launch ShopOS',
    },
    SERVICES: {
      href: currentBusiness ? `/workspaces/serviceos/${currentBusiness.id}` : '/admin/service',
      label: 'Launch ServiceOS',
    },
    SCHOOL: {
      href: currentBusiness ? `/school/admin?org=${currentBusiness.id}` : '/school/admin',
      label: 'Launch SchoolOS',
    },
    HOTEL: {
      href: currentBusiness ? `/hotel/manager?org=${currentBusiness.id}` : '/hotel/manager',
      label: 'Launch HotelOS',
    },
    LOGISTICS: {
      href: currentBusiness ? `/business/logisticsos/dashboard?org=${currentBusiness.id}` : '/business/logisticsos/dashboard',
      label: 'Launch LogisticsOS',
    },
    HEALTHCARE: {
      href: currentBusiness ? `/admin/healthcare?org=${currentBusiness.id}` : '/admin/healthcare',
      label: 'Launch HealthOS',
    },
  };

  const os = OS_ROUTES[effectiveOrgType] ?? {
    href: currentBusiness?.workspaceUrl || '/business',
    label: 'Open Workspace',
  };
  const verticalMeta = VERTICAL_META[effectiveOrgType];
  const VerticalIcon = verticalMeta?.icon || Building2;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-sm">
            <VerticalIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-ink flex items-center gap-2">
              {currentBusiness ? currentBusiness.name : 'Business Hub'}
              {currentBusiness && <BadgeCheck className="w-4 h-4 text-brand-700" />}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentBusiness
                ? `${verticalMeta?.osName || currentBusiness.type} · Dedicated vertical workspace & shared merchant tools`
                : 'Manage your business pages and launch your dedicated vertical OS'}
            </p>
          </div>
        </div>
        {currentBusiness && (
          <Link
            href={currentBusiness.workspaceUrl || os.href}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black shadow-sm hover:bg-teal-900 transition-all"
          >
            {os.label} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Pages Switcher Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-ink uppercase tracking-wider">
              Your Business Pages & Workspaces ({myBusinesses.length})
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Each business runs on its own dedicated vertical operating system (HotelOS, RestaurantOS, ShopOS, ServiceOS, SchoolOS).
            </p>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1 text-xs font-black text-teal-800 hover:text-teal-900 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Create Business Page
          </button>
        </div>

        {myBusinesses.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm font-black text-slate-700">You don&apos;t manage any business pages yet.</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Launch a retail shop, restaurant, service trade, school, hotel, or clinic with its own dedicated OS dashboard.
            </p>
            <button
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black shadow-sm hover:bg-teal-900 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create a Business Page
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myBusinesses.map((biz) => {
              const isCurrent = (activeBusiness?.id || myBusinesses[0]?.id) === biz.id;
              const bizMeta = VERTICAL_META[biz.type];
              const BizIcon = bizMeta?.icon || Building2;
              return (
                <div
                  key={biz.id}
                  className={cn(
                    'p-4 rounded-xl border transition-all flex flex-col justify-between gap-3',
                    isCurrent
                      ? 'border-teal-700 bg-teal-50/40 ring-1 ring-teal-600/20'
                      : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-800/10 text-teal-800 flex items-center justify-center shrink-0">
                      <BizIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-ink truncate">{biz.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {bizMeta?.osName || biz.type} · {biz.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => switchToBusiness(biz)}
                      className="px-3 py-1.5 rounded-lg bg-teal-800 text-white hover:bg-teal-900 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      {bizMeta?.label || 'Open Workspace'} <ArrowRight className="w-3 h-3" />
                    </button>
                    {myBusinesses.length > 1 && !isCurrent && (
                      <button
                        onClick={() => switchToBusiness(biz)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Business Dedicated OS Banner & Shared Growth Toolkit */}
      {currentBusiness && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-2xl p-6 text-white shadow-lg space-y-5 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-black uppercase tracking-wider">
                  {verticalMeta?.osName || currentBusiness.type}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Role: {currentBusiness.role}
                </span>
              </div>
              <h2 className="text-xl font-black mt-1.5 text-white">{currentBusiness.name}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                {currentBusiness.address || 'Calabar'}
              </p>
              {verticalMeta?.desc && (
                <p className="text-xs text-slate-300 mt-2 max-w-xl">
                  {verticalMeta.desc}
                </p>
              )}
            </div>
            <Link
              href={currentBusiness.workspaceUrl || os.href}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-teal-500/20"
            >
              {os.label} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
              Shared Business Settings & Growth Toolkit
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                href={`/business/website?org=${currentBusiness.id}`}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-teal-500/50 transition-all group flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-teal-300 transition-colors">Website Builder</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize your dedicated branded microsite</p>
                </div>
              </Link>

              <Link
                href={`/business/domain?org=${currentBusiness.id}`}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-indigo-500/50 transition-all group flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">Custom Domain</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Connect your own web address & domain</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setShowTeamModal(true)}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-blue-500/50 transition-all text-left group flex flex-col justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">RBAC</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">Team & Staff Access</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Invite cashiers, managers, & team roles</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowBranchModal(true)}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-emerald-500/50 transition-all text-left group flex flex-col justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Branches</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors">Branch Locations</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage branch addresses & outlets</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowJobModal(true)}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Hiring</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">Post a Job Opening</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Recruit local talent for {currentBusiness.name}</p>
                </div>
              </button>

              <Link
                href={`/events/create?org=${currentBusiness.id}`}
                className="p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/70 hover:border-pink-500/50 transition-all text-left group flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                    <CalendarPlus className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded">Events</span>
                </div>
                <div>
                  <p className="text-xs font-black text-white group-hover:text-pink-300 transition-colors">Host a City Event</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Publish an official event for {currentBusiness.name}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {currentBusiness && (
        <>
          <BranchManagerModal
            isOpen={showBranchModal}
            onClose={() => setShowBranchModal(false)}
            organizationId={currentBusiness.id}
            organizationName={currentBusiness.name}
          />
          <TeamManagerModal
            isOpen={showTeamModal}
            onClose={() => setShowTeamModal(false)}
            organizationId={currentBusiness.id}
            organizationName={currentBusiness.name}
          />

          {/* Post a Job Modal */}
          {showJobModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-base">Post a Job Opening</h3>
                    <p className="text-xs text-slate-400">Hiring for {currentBusiness.name}</p>
                  </div>
                  <button onClick={() => setShowJobModal(false)} className="text-white/70 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateJob} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                  {jobError && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                      {jobError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role / Job Title *</label>
                    <input
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Store Supervisor, Kitchen Chef, Sales Executive"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Employment Type</label>
                      <select
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                      >
                        <option value="FULL_TIME">Full-Time</option>
                        <option value="PART_TIME">Part-Time</option>
                        <option value="CONTRACT">Contract</option>
                        <option value="INTERNSHIP">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Department / Category</label>
                      <input
                        type="text"
                        value={jobCategory}
                        onChange={(e) => setJobCategory(e.target.value)}
                        placeholder="e.g. Operations, Sales, Hospitality"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Salary / Pay Range</label>
                      <input
                        type="text"
                        value={jobPay}
                        onChange={(e) => setJobPay(e.target.value)}
                        placeholder="e.g. ₦80,000 - ₦120,000 / mo"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Location / Area</label>
                      <input
                        type="text"
                        value={jobArea}
                        onChange={(e) => setJobArea(e.target.value)}
                        placeholder="e.g. Marian Road, Calabar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Role Description & Requirements</label>
                    <textarea
                      rows={4}
                      value={jobDesc}
                      onChange={(e) => setJobDesc(e.target.value)}
                      placeholder="Responsibilities, qualifications, and how candidates should prepare..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowJobModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={jobSubmitting}
                      className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {jobSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Publish Job
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
