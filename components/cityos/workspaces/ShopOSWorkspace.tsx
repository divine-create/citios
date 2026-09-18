'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  Package,
  ShoppingCart,
  Users,
  UserRound,
  Tag,
  Briefcase,
  Store,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { fmtNaira } from '@/lib/format';
import { StatTile, Pill, SectionHead } from '@/components/cityos/CityUI';
import {
  getShopDashboardData,
  getProducts,
  getOrders,
  getCustomers,
  getStaff,
  getCoupons,
} from '@/lib/actions/retail';
import { getCanonicalOrganization } from '@/app/actions/org';
import CityOSLive from '@/components/cityos/CityOSLive';
import { useExperience } from '@/components/cityos/ExperienceStore';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Products', 'Orders', 'Customers', 'Staff', 'Promotions'] as const;
type Tab = (typeof TABS)[number];

const STATUS_META: Record<string, { label: string; tone: 'orange' | 'green' | 'blue' | 'red' }> = {
  COMPLETED: { label: 'Completed', tone: 'green' },
  REFUNDED: { label: 'Refunded', tone: 'red' },
  PENDING: { label: 'Pending', tone: 'orange' },
};

type ShopOrg = NonNullable<Awaited<ReturnType<typeof getCanonicalOrganization>>>;
type Dashboard = Awaited<ReturnType<typeof getShopDashboardData>>;
type Product = Awaited<ReturnType<typeof getProducts>>[number];
type Order = Awaited<ReturnType<typeof getOrders>>[number];
type Customer = Awaited<ReturnType<typeof getCustomers>>[number];
type StaffMember = Awaited<ReturnType<typeof getStaff>>[number];
type Coupon = Awaited<ReturnType<typeof getCoupons>>[number];

export default function ShopOSWorkspace({ slug }: { slug: string }) {
  const { setExperience } = useExperience();
  const [tab, setTab] = useState<Tab>('Overview');
  const [org, setOrg] = useState<ShopOrg | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const found = await getCanonicalOrganization(slug);
        if (!live) return;
        if (!found) {
          setNotFound(true);
          setLoaded(true);
          return;
        }
        setOrg(found);
        const [d, p, o, c, s, k] = await Promise.all([
          getShopDashboardData(slug),
          getProducts(slug),
          getOrders(slug),
          getCustomers(slug),
          getStaff(slug),
          getCoupons(slug),
        ]);
        if (!live) return;
        setDashboard(d);
        setProducts(p);
        setOrders(o);
        setCustomers(c);
        setStaff(s);
        setCoupons(k);
      } catch (err: any) {
        // requireMembership throws for non-members — show an honest denial.
        if (live) setDenied(err?.message || 'Access denied');
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 text-[12px] font-bold text-slate-400">
        Loading workspace…
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🏪</p>
        <h1 className="text-lg font-black text-ink">Workspace not found.</h1>
        <p className="text-sm text-slate-500">This store does not exist on CityOS.</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">🔒</p>
        <h1 className="text-lg font-black text-ink">Members only</h1>
        <p className="text-sm text-slate-500">You are not a member of this organization&apos;s workspace.</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 text-white p-7 md:p-9">
        <div className="absolute -right-14 -top-14 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-4 justify-between">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/95 to-white/70 text-teal-900 flex items-center justify-center text-3xl shadow-lg shrink-0">
              {org.name.slice(0, 1)}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Pill tone="orange">ShopOS workspace</Pill>
              </div>
              <h1 className="mt-2 text-xl md:text-2xl font-black tracking-tight">{org.name}</h1>
              <p className="text-[12px] text-teal-100/80 font-medium mt-0.5">{org.address || 'CityOS merchant'}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/org/${org.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-[11px] font-black hover:bg-white/20 transition-colors"
            >
              <Store className="w-3.5 h-3.5" /> Public store
            </Link>
            <button
              onClick={() => setExperience('resident')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-teal-900 text-[11px] font-black hover:bg-teal-50 transition-colors"
            >
              Switch experience <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <CityOSLive orgId={org.id} name={org.name} />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t}</TabBtn>
        ))}
      </div>

      {tab === 'Overview' ? <Overview data={dashboard} /> : null}
      {tab === 'Products' ? <Products data={products} /> : null}
      {tab === 'Orders' ? <Orders data={orders} /> : null}
      {tab === 'Customers' ? <Customers data={customers} /> : null}
      {tab === 'Staff' ? <Staff data={staff} /> : null}
      {tab === 'Promotions' ? <Promos data={coupons} /> : null}
    </div>
  );
}

function TabBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ring-1',
        active ? 'bg-teal-800 text-white ring-teal-800 shadow-sm' : 'bg-white text-slate-600 ring-slate-200 hover:ring-teal-300',
      )}
    >
      {children}
    </button>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-white">
      <p className="text-[13px] font-black text-ink">Nothing here yet</p>
      <p className="text-[11px] text-slate-400 font-medium mt-1">{text}</p>
    </div>
  );
}

function Overview({ data }: { data: Dashboard | null }) {
  if (!data) return <EmptyNote text="Dashboard data is unavailable." />;
  const maxTop = data.topProducts[0]?.revenue ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Net sales today" value={fmtNaira(data.netSales)} icon={<LayoutGrid className="w-4 h-4" />} />
        <StatTile label="Transactions today" value={String(data.transactions)} delta={`${data.totalOrders} all time`} icon={<ShoppingCart className="w-4 h-4" />} tone="orange" />
        <StatTile label="Live products" value={String(data.totalProducts)} delta={`${data.lowStockCount} low-stock alerts`} icon={<Package className="w-4 h-4" />} tone="blue" />
        <StatTile label="New customers today" value={String(data.newCustomersToday)} icon={<Users className="w-4 h-4" />} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Top sellers" sub="By revenue across completed orders" />
          {data.topProducts.length === 0 ? (
            <p className="text-[12px] text-slate-400 font-medium">No completed sales yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p: any) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="text-lg">🧺</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-600" style={{ width: maxTop > 0 ? `${Math.min(100, (p.revenue / maxTop) * 100)}%` : '0%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{`${p.units} sold`}</span>
                    </div>
                  </div>
                  <span className="text-[12px] font-black text-ink shrink-0">{fmtNaira(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 p-6">
          <SectionHead title="Low stock" sub="Restock before market day" />
          {data.lowStockProducts.length === 0 ? (
            <p className="text-[12px] text-slate-400 font-medium">No low-stock alerts. Set low-stock levels on products to see alerts here.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {data.lowStockProducts.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{p.sku || '—'}</p>
                  </div>
                  <Pill tone={p.stockQuantity === 0 ? 'red' : 'orange'}>{`${p.stockQuantity} ${p.unit || ''}`.trim()}</Pill>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-6">
        <SectionHead title="Latest completed orders" />
        {data.recentOrders.length === 0 ? (
          <p className="text-[12px] text-slate-400 font-medium">No orders yet.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-ink truncate">
                    {o.items.map((i: any) => `${i.quantity}× ${i.productName}`).join(', ')}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">{`${o.customerName || 'Walk-in'} · ${o.cashierName}`}</p>
                </div>
                <span className="text-[12px] font-black text-ink">{fmtNaira(o.totalAmount)}</span>
                <Pill tone={STATUS_META[o.status]?.tone ?? 'blue'}>{STATUS_META[o.status]?.label ?? o.status}</Pill>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Products({ data }: { data: Product[] }) {
  const low = data.filter((p: any) => p.lowStockLevel != null && p.stockQuantity <= (p.lowStockLevel as number)).length;
  const stockTotal = data.reduce((s: number, p: any) => s + (p.stockQuantity ?? 0), 0);
  if (data.length === 0) return <EmptyNote text="No products yet. Add inventory from the register." />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Inventory lines" value={String(data.length)} />
        <MiniStat label="Units on floor" value={String(stockTotal)} />
        <MiniStat label="Low-stock alerts" value={String(low)} warn={low > 0} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span className="col-span-4">Product</span>
          <span className="col-span-3">Category</span>
          <span className="col-span-2 text-right">Price</span>
          <span className="col-span-2 text-center">Stock</span>
          <span className="col-span-1 text-right">Status</span>
        </div>
        <div className="divide-y divide-slate-50">
          {data.map((p: any) => (
            <div key={p.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center px-5 py-3.5">
              <div className="col-span-2 md:col-span-4 min-w-0">
                <p className="text-[12px] font-black text-ink truncate">{p.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{p.sku || '—'}</p>
              </div>
              <span className="hidden md:block md:col-span-3 text-[11px] font-bold text-slate-500">{p.categoryName || 'Uncategorized'}</span>
              <div className="col-span-1 md:col-span-2 text-right">
                <span className="text-[12px] font-black text-ink">{fmtNaira(p.price)}</span>
              </div>
              <div className="col-span-1 md:col-span-2 text-center">
                <Pill tone={(p.stockQuantity ?? 0) === 0 ? 'red' : (p.stockQuantity ?? 0) < 10 ? 'orange' : 'green'}>{`${p.stockQuantity ?? 0} ${p.unit || ''}`.trim()}</Pill>
              </div>
              <div className="col-span-2 md:col-span-1 text-right">
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Orders({ data }: { data: Order[] }) {
  if (data.length === 0) return <EmptyNote text="No orders yet. Resident and register orders will appear here." />;
  return (
    <div className="space-y-5">
      <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
        <CheckCircle2 className="w-3.5 h-3.5" /> Live database orders
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {data.map((o: any) => {
          const s = STATUS_META[o.status] || { label: o.status, tone: 'blue' as const };
          return (
            <div key={o.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-ink truncate">
                  {o.items.map((i: any) => `${i.quantity}× ${i.productName}`).join(', ')}
                </p>
                <p className="text-[10px] font-bold text-slate-400">{`${o.customerName || 'Walk-in'} · ${o.cashierName}`}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                <Pill tone="slate">{o.paymentMethod || '—'}</Pill>
                <span className="text-[13px] font-black text-ink w-24 text-right">{fmtNaira(o.totalAmount)}</span>
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Customers({ data }: { data: Customer[] }) {
  if (data.length === 0) return <EmptyNote text="No customers yet. Customers appear when residents order or staff add them." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((c: any) => (
        <div key={c.id} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
            {(c.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{c.name}</p>
            <p className="text-[10px] font-bold text-slate-400">{[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact on file'}</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[12px] font-black text-ink">{c.loyaltyPoints ?? 0}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">loyalty points</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Staff({ data }: { data: StaffMember[] }) {
  if (data.length === 0) return <EmptyNote text="No staff yet. Invite your team from settings." />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
      {data.map((s) => (
        <div key={s.membershipId} className="px-5 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black flex items-center justify-center shrink-0">
            <UserRound className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-ink truncate">{s.name}</p>
            <p className="text-[11px] font-bold text-slate-400">{s.email || 'No email on file'}</p>
          </div>
          <span className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.roles.join(' · ')}</span>
        </div>
      ))}
    </div>
  );
}

function Promos({ data }: { data: Coupon[] }) {
  if (data.length === 0) return <EmptyNote text="No coupons yet. Create discount codes from the register." />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((c: any) => (
        <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </span>
            <Pill tone={c.isActive ? 'green' : 'slate'}>{c.isActive ? 'Active' : 'Inactive'}</Pill>
          </div>
          <p className="mt-3 text-[14px] font-black text-ink">{c.code}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{c.description || 'Store coupon'}</p>
          <div className="mt-3 flex items-center gap-2">
            <Pill tone="orange">{c.type === 'PERCENT' ? `${c.value}% off` : `${fmtNaira(c.value)} off`}</Pill>
            <span className="text-[11px] font-bold text-slate-400">{`min spend ${fmtNaira(c.minSpend || 0)}`}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn('bg-white rounded-2xl border p-4', warn ? 'border-orange-200' : 'border-slate-100')}>
      <p className="text-lg font-black text-ink">{value}</p>
      <p className={cn('text-[9px] font-bold uppercase tracking-wider', warn ? 'text-orange-600' : 'text-slate-400')}>{label}</p>
    </div>
  );
}
