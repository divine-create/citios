import React from 'react';
import { requireMembership } from '@/lib/actions/tenant';
import { getRestaurantOSSettings } from '@/lib/actions/restaurantos';
import {
  getOverviewContext,
  getOverviewAlerts,
  getLiveService,
  getOverviewSales,
  getOverviewInventory,
  getOverviewReservations,
  getOverviewShift,
  getConfigurationHealth,
} from '@/lib/actions/restaurant-intelligence';
import { Badge } from '@/components/ui';
import { formatNaira } from '@/lib/utils';
import Link from 'next/link';
import {
  AlertCircle, AlertTriangle, Clock, ClipboardList, Package,
  Utensils, TrendingUp, ShoppingBag, Percent, DollarSign,
  Calendar, ChefHat, Flame, BarChart2, CheckCircle, ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Tiny presentational primitives (keeps JSX readable, no extra files needed)
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
      {children}
    </h2>
  );
}

function StatCard({
  label, value, icon, href, accent = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div className={`p-5 rounded-2xl border shadow-sm flex flex-col gap-3 h-full ${accent ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      {icon && <span className="opacity-70">{icon}</span>}
      <div>
        <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${accent ? 'text-slate-400' : 'text-slate-400'}`}>{label}</p>
        <div className={`text-2xl font-black leading-tight ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      </div>
      {href && (
        <span className={`text-[11px] font-bold uppercase flex items-center gap-1 mt-auto ${accent ? 'text-slate-300' : 'text-slate-500'}`}>
          View <ArrowRight size={11} />
        </span>
      )}
    </div>
  );
  if (href) return <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

function AlertCard({
  severity, title, description, action, href,
}: {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  action: string;
  href: string;
}) {
  const styles = {
    critical: 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-900',
    warning: 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900',
    info: 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-900',
  };
  const actionStyles = {
    critical: 'text-rose-600',
    warning: 'text-amber-700',
    info: 'text-slate-600',
  };
  return (
    <Link
      href={href}
      className={`block p-5 rounded-2xl border transition-colors ${styles[severity]}`}
      aria-label={`${title}: ${description}. Action: ${action}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-black text-sm">{title}</h3>
          <p className="text-sm font-medium mt-1 opacity-80">{description}</p>
        </div>
        <span className={`text-[11px] font-bold uppercase whitespace-nowrap ${actionStyles[severity]}`}>
          {action} →
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const locationId = sp.location;

  await requireMembership(slug, ['OWNER', 'ADMIN', 'MANAGER'], locationId);

  // Fetch all sections in parallel — each query is independently scoped
  const [settings, context, alerts, service, sales, shift, health] = await Promise.all([
    getRestaurantOSSettings(slug),
    getOverviewContext(slug, locationId),
    getOverviewAlerts(slug, locationId),
    getLiveService(slug, locationId),
    getOverviewSales(slug, locationId),
    getOverviewShift(slug, locationId),
    getConfigurationHealth(slug, locationId),
  ]);

  // Optional sections — only fetched when capabilities exist
  const inventoryData = (settings as any)?.enableInventory
    ? await getOverviewInventory(slug, locationId)
    : null;

  const reservationData = (settings as any)?.hasTables
    ? await getOverviewReservations(slug, locationId)
    : null;

  // Attention conditions
  const attentionItems: {
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    action: string;
    href: string;
  }[] = [];

  if (alerts.overdueTickets > 0) {
    attentionItems.push({
      severity: 'critical',
      title: `${alerts.overdueTickets} Overdue Kitchen Ticket${alerts.overdueTickets > 1 ? 's' : ''}`,
      description: `${alerts.overdueTickets > 1 ? 'These tickets have' : 'This ticket has'} been open for more than 20 minutes.`,
      action: 'Open KDS',
      href: `/workspaces/restaurantos/${slug}/kds`,
    });
  }
  if (!context.shift) {
    attentionItems.push({
      severity: 'warning',
      title: 'No Active Shift',
      description: 'A shift must be open before processing POS orders.',
      action: 'Open Shift',
      href: `/workspaces/restaurantos/${slug}/pos`,
    });
  }
  if (alerts.lowStockCount > 0) {
    attentionItems.push({
      severity: 'warning',
      title: `${alerts.lowStockCount} Low-Stock Item${alerts.lowStockCount > 1 ? 's' : ''}`,
      description: 'These ingredients are at or below their minimum threshold.',
      action: 'Review Stock',
      href: `/workspaces/restaurantos/${slug}/management/inventory`,
    });
  }
  if (alerts.missingRecipes > 0 && (settings as any)?.enableRecipes) {
    attentionItems.push({
      severity: 'info',
      title: `${alerts.missingRecipes} Menu Item${alerts.missingRecipes > 1 ? 's' : ''} Missing Recipe`,
      description: 'These items have no recipe linked. Inventory and costing will be inaccurate.',
      action: 'Configure Recipes',
      href: `/workspaces/restaurantos/${slug}/management/recipes`,
    });
  }
  if (alerts.missingCost > 0 && (settings as any)?.enableFoodCosting) {
    attentionItems.push({
      severity: 'info',
      title: `${alerts.missingCost} Item${alerts.missingCost > 1 ? 's' : ''} with Incomplete Costing`,
      description: 'Theoretical food cost cannot be calculated for these items.',
      action: 'Review Costing',
      href: `/workspaces/restaurantos/${slug}/management/costing`,
    });
  }
  if (reservationData && reservationData.arrivingSoonCount > 0) {
    attentionItems.push({
      severity: 'info',
      title: `${reservationData.arrivingSoonCount} Reservation${reservationData.arrivingSoonCount > 1 ? 's' : ''} Arriving Soon`,
      description: 'Guests are expected to arrive within the next hour.',
      action: 'View Reservations',
      href: `/workspaces/restaurantos/${slug}/management/reservations`,
    });
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-10 pb-16">

      {/* ── TODAY HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            {context.organizationName}
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-2">
            {context.locationName} · {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {context.shift ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Shift Open
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wide">
              No Active Shift
            </span>
          )}
        </div>
      </div>

      {/* ── ATTENTION REQUIRED ───────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <section aria-label="Attention Required">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <AlertCircle size={13} className="text-rose-500" aria-hidden />
              Attention Required
            </span>
          </SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {attentionItems.map((item, i) => (
              <AlertCard key={i} {...item} />
            ))}
          </div>
        </section>
      )}

      {/* ── LIVE SERVICE + KITCHEN ───────────────────────────────────── */}
      <section aria-label="Live Service and Kitchen">
        <SectionHeading>
          <span className="inline-flex items-center gap-2">
            <Flame size={13} className="text-orange-500" aria-hidden />
            Live Service &amp; Kitchen
          </span>
        </SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Pending"
            value={service.openOrders}
            icon={<ClipboardList size={20} className="text-blue-500" />}
            href={`/workspaces/restaurantos/${slug}/pos`}
          />
          <StatCard
            label="Preparing"
            value={service.preparingOrders}
            icon={<ChefHat size={20} className="text-orange-500" />}
            href={`/workspaces/restaurantos/${slug}/kds`}
          />
          <StatCard
            label="Ready for Pickup"
            value={service.readyOrders}
            icon={<CheckCircle size={20} className="text-emerald-500" />}
            href={`/workspaces/restaurantos/${slug}/kds`}
          />
          {(settings as any)?.hasTables ? (
            <StatCard
              label="Active Tables"
              value={`${service.activeTables} / ${service.totalTables}`}
              icon={<Utensils size={20} className="text-purple-500" />}
            />
          ) : (
            <StatCard
              label="Total Active"
              value={service.openOrders + service.preparingOrders + service.readyOrders}
              icon={<BarChart2 size={20} className="text-slate-400" />}
            />
          )}
        </div>
      </section>

      {/* ── SALES ────────────────────────────────────────────────────── */}
      <section aria-label="Today's Sales">
        <SectionHeading>
          <span className="inline-flex items-center gap-2">
            <TrendingUp size={13} className="text-emerald-500" aria-hidden />
            Today's Sales
          </span>
        </SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Gross Sales"
            value={formatNaira(sales.grossSales)}
            icon={<TrendingUp size={20} className="text-emerald-500" />}
          />
          <StatCard
            label="Orders Completed"
            value={sales.orderCount}
            icon={<ShoppingBag size={20} className="text-indigo-500" />}
          />
          <StatCard
            label="Avg Order Value"
            value={sales.orderCount > 0 ? formatNaira(sales.avgOrderValue) : 'N/A'}
            icon={<DollarSign size={20} className="text-blue-500" />}
          />
          {(settings as any)?.enableFoodCosting ? (
            <StatCard
              label="Theoretical Margin"
              value={
                sales.hasCogs
                  ? `${sales.theoreticalMargin.toFixed(1)}%`
                  : 'Costing unavailable'
              }
              icon={<Percent size={20} className={sales.theoreticalMargin > 60 ? 'text-emerald-400' : 'text-amber-400'} />}
              href={`/workspaces/restaurantos/${slug}/management/costing`}
              accent
            />
          ) : null}
        </div>
        {(settings as any)?.enableFoodCosting && sales.hasCogs && (
          <p className="mt-2 text-xs text-slate-400 font-medium">
            * Theoretical Gross Margin = (Gross Sales − Theoretical COGS) / Gross Sales. Not accounting profit.
            COGS today: <strong>{formatNaira(sales.cogs)}</strong>.
          </p>
        )}
      </section>

      {/* ── INVENTORY ────────────────────────────────────────────────── */}
      {inventoryData && (inventoryData.lowStockCount > 0 || inventoryData.outOfStockCount > 0 || inventoryData.wasteCount > 0) && (
        <section aria-label="Inventory Summary">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Package size={13} className="text-amber-500" aria-hidden />
              Inventory
            </span>
          </SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inventoryData.outOfStockCount > 0 && (
              <Link
                href={`/workspaces/restaurantos/${slug}/management/inventory`}
                className="block p-5 bg-rose-50 border border-rose-200 rounded-2xl hover:bg-rose-100 transition-colors"
              >
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1">Out of Stock</p>
                <p className="text-2xl font-black text-rose-900">{inventoryData.outOfStockCount}</p>
                <ul className="mt-2 space-y-1">
                  {inventoryData.outOfStockItems.map((i: any) => (
                    <li key={i.id} className="text-sm text-rose-700 font-medium">{i.name}</li>
                  ))}
                </ul>
              </Link>
            )}
            {inventoryData.lowStockCount > 0 && (
              <Link
                href={`/workspaces/restaurantos/${slug}/management/inventory`}
                className="block p-5 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors"
              >
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">Low Stock</p>
                <p className="text-2xl font-black text-amber-900">{inventoryData.lowStockCount}</p>
                <ul className="mt-2 space-y-1">
                  {inventoryData.lowStockItems.map((i: any) => (
                    <li key={i.id} className="text-sm text-amber-700 font-medium">
                      {i.name} — {i.quantity} {i.unit} (min: {i.lowStockLevel})
                    </li>
                  ))}
                </ul>
              </Link>
            )}
            {inventoryData.wasteCount > 0 && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Waste Today</p>
                <p className="text-2xl font-black text-slate-900">{inventoryData.wasteCount} entries</p>
                {inventoryData.wasteValue > 0 && (
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Value: <span className="text-slate-700 font-bold">{formatNaira(inventoryData.wasteValue)}</span>
                  </p>
                )}
                <Link
                  href={`/workspaces/restaurantos/${slug}/management/waste`}
                  className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1 mt-3"
                >
                  View waste log <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── SHIFT SUMMARY ─────────────────────────────────────────────── */}
      {shift && (
        <section aria-label="Shift Summary">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Clock size={13} className="text-indigo-500" aria-hidden />
              Shift Summary
            </span>
          </SectionHeading>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                <p className="font-black text-slate-900">
                  {shift.status === 'OPEN' ? (
                    <span className="text-emerald-600">Open</span>
                  ) : (
                    <span className="text-slate-500">Closed</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opened</p>
                <p className="font-black text-slate-900 text-sm">
                  {new Date(shift.openedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opening Float</p>
                <p className="font-black text-slate-900">{formatNaira(shift.openingFloat)}</p>
              </div>
              {shift.status === 'CLOSED' && shift.variance != null && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Variance</p>
                  <p className={`font-black text-lg ${Math.abs(shift.variance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatNaira(shift.variance)}
                  </p>
                </div>
              )}
            </div>
            {shift.status === 'CLOSED' && Math.abs(shift.variance ?? 0) > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertTriangle size={14} />
                Cash variance detected. Expected {formatNaira(shift.expectedCash ?? 0)}, received {formatNaira(shift.actualCash ?? 0)}.
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── UPCOMING RESERVATIONS ─────────────────────────────────────── */}
      {reservationData && reservationData.upcomingCount > 0 && (
        <section aria-label="Upcoming Reservations">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <Calendar size={13} className="text-blue-500" aria-hidden />
              Upcoming Reservations
            </span>
          </SectionHeading>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-black text-slate-900">{reservationData.upcomingCount} remaining today</span>
              <Link
                href={`/workspaces/restaurantos/${slug}/management/reservations`}
                className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1"
              >
                All reservations <ArrowRight size={11} />
              </Link>
            </div>
            {reservationData.arrivingSoon.length > 0 && (
              <div className="divide-y divide-slate-100">
                {reservationData.arrivingSoon.map((r: any) => (
                  <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{r.customerName}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Party of {r.partySize}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-700">
                        {new Date(r.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Badge variant={r.status === 'confirmed' ? 'success' : 'warning'}>{r.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── CONFIGURATION HEALTH ──────────────────────────────────────── */}
      {(health.missingRecipes > 0 || health.missingCost > 0 || health.unavailableItems > 0) && (
        <section aria-label="Configuration Health">
          <SectionHeading>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={13} className="text-slate-400" aria-hidden />
              Configuration Health
            </span>
          </SectionHeading>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100">
            {health.unavailableItems > 0 && (
              <Link
                href={`/workspaces/restaurantos/${slug}/management/menu`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-black text-slate-900 text-sm">{health.unavailableItems} menu item{health.unavailableItems > 1 ? 's' : ''} marked unavailable (86'd)</p>
                  <p className="text-xs text-slate-500 mt-0.5">These items will not appear on the POS.</p>
                </div>
                <ArrowRight size={16} className="text-slate-400 shrink-0" />
              </Link>
            )}
            {(settings as any)?.enableRecipes && health.missingRecipes > 0 && (
              <Link
                href={`/workspaces/restaurantos/${slug}/management/recipes`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-black text-slate-900 text-sm">{health.missingRecipes} item{health.missingRecipes > 1 ? 's' : ''} without a recipe</p>
                  <p className="text-xs text-slate-500 mt-0.5">Inventory consumption and costing will be unavailable for these items.</p>
                </div>
                <ArrowRight size={16} className="text-slate-400 shrink-0" />
              </Link>
            )}
            {(settings as any)?.enableFoodCosting && health.missingCost > 0 && (
              <Link
                href={`/workspaces/restaurantos/${slug}/management/costing`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-black text-slate-900 text-sm">{health.missingCost} item{health.missingCost > 1 ? 's' : ''} with no cost basis</p>
                  <p className="text-xs text-slate-500 mt-0.5">Theoretical food cost cannot be computed for these items.</p>
                </div>
                <ArrowRight size={16} className="text-slate-400 shrink-0" />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── EMPTY STATE — brand new restaurant ───────────────────────── */}
      {sales.orderCount === 0 && service.openOrders === 0 && attentionItems.length <= 1 && (
        <section aria-label="Getting Started">
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center bg-slate-50">
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Ready to serve</p>
            <p className="text-slate-700 font-black text-lg">No orders yet today</p>
            <p className="text-slate-400 text-sm mt-2">Open a shift on the POS to start taking orders.</p>
            <Link
              href={`/workspaces/restaurantos/${slug}/pos`}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-black rounded-xl hover:bg-slate-800 transition-colors"
            >
              Open POS <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}
