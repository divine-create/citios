'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed, Plus, Minus, Check, Loader2, Trash2, ArrowLeftRight, Printer,
} from 'lucide-react';
import ThermalReceiptModal from '@/components/common/ThermalReceiptModal';
import { type PrintableReceiptData } from '@/lib/receiptUtils';
import { playOrderChime, playCashRegisterChime } from '@/lib/audio';
import AudioAlertToggle from '@/components/common/AudioAlertToggle';
import { useAccountSwitcher } from '@/components/cityos/AccountSwitcherContext';
import { useMoney } from '@/components/cityos/CityProvider';
import { StatTile, Pill, SectionHead } from '@/components/cityos/CityUI';
import { getCanonicalOrganization } from '@/app/actions/org';
import {
  getRestaurantOSData, getRestaurantOSSettings, updateRestaurantOSSettings,
  getMenuItems, createMenuItem, updateMenuItem, toggleMenuItemAvailability, deleteMenuItem,
  createMenuItemAddon, createMenuItemVariant,
  getTables, createTable, updateTableStatus,
  getReservations, createReservation, updateReservationStatus,
  getKitchenTickets, getOrders, createPosOrder, updateOrderStatus,
  getInventoryItems, createInventoryItem, adjustStock, deleteInventoryItem,
  getFinancialSummary, addExpense, getExpenses,
} from '@/lib/actions/restaurantos';
import { cn } from '@/lib/utils';

type Org = NonNullable<Awaited<ReturnType<typeof getCanonicalOrganization>>>;
type Settings = NonNullable<Awaited<ReturnType<typeof getRestaurantOSSettings>>>;
type MenuItemRow = Awaited<ReturnType<typeof getMenuItems>>[number];
type TableRow = Awaited<ReturnType<typeof getTables>>[number];
type ReservationRow = Awaited<ReturnType<typeof getReservations>>[number];
type Ticket = Awaited<ReturnType<typeof getKitchenTickets>>[number];
type OrderRow = Awaited<ReturnType<typeof getOrders>>[number];
type InventoryRow = Awaited<ReturnType<typeof getInventoryItems>>[number];
type ExpenseRow = Awaited<ReturnType<typeof getExpenses>>[number];
type Finance = NonNullable<Awaited<ReturnType<typeof getFinancialSummary>>>;

const ALL_TABS = ['POS', 'Kitchen', 'Menu', 'Inventory', 'Finance', 'Tables', 'Reservations', 'Settings'] as const;
type Tab = (typeof ALL_TABS)[number];

const STATUS_TONE: Record<string, 'orange' | 'green' | 'blue' | 'red'> = {
  PENDING: 'orange', PREPARING: 'orange', READY: 'blue', DELIVERING: 'blue', COMPLETED: 'green',
};

export default function RestaurantOSWorkspace({ slug }: { slug: string }) {
  const { fmt } = useMoney();
  const { switchToPersonal } = useAccountSwitcher();
  const [tab, setTab] = useState<Tab>('POS');
  const [org, setOrg] = useState<Org | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [menu, setMenu] = useState<MenuItemRow[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [loaded, setLoaded] = useState(false);

  const style = settings?.serviceStyle ?? 'HYBRID';
  const showTables = style === 'FULL_SERVICE' || style === 'HYBRID';
  const tabs = ALL_TABS.filter((t) => (t === 'Tables' || t === 'Reservations' ? showTables : true));


  // POS state: items being ordered at the counter / table.
  const [posLines, setPosLines] = useState<{ menuItemId: string; name: string; price: number; qty: number }[]>([]);
  const [posType, setPosType] = useState<'DINE_IN' | 'TAKEOUT'>('TAKEOUT');
  const [posTableId, setPosTableId] = useState<string>('');
  const [posPayment, setPosPayment] = useState<'WALLET' | 'CASH' | 'POS' | ''>('CASH');
  const [posBusy, setPosBusy] = useState(false);
  const [posMsg, setPosMsg] = useState<string | null>(null);
  const [receiptModalData, setReceiptModalData] = useState<PrintableReceiptData | null>(null);
  const previousTicketCountRef = useRef<number | null>(null);

  function posAdd(item: MenuItemRow) {
    if (item.isAvailable === false) return;
    setPosLines((prev) => {
      const ex = prev.find((l) => l.menuItemId === item.id);
      if (ex) return prev.map((l) => (l.menuItemId === item.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function posQty(menuItemId: string, qty: number) {
    setPosLines((prev) => (qty <= 0 ? prev.filter((l) => l.menuItemId !== menuItemId) : prev.map((l) => (l.menuItemId === menuItemId ? { ...l, qty } : l))));
  }

  const posTotal = posLines.reduce((s, l) => s + l.price * l.qty, 0);
  const posTax = Math.round(posTotal * ((settings?.taxRate ?? 0) / 100));
  const posService = Math.round(posTotal * ((settings?.serviceCharge ?? 0) / 100));

  async function placeOrder() {
    if (posLines.length === 0 || posBusy) return;
    setPosBusy(true);
    setPosMsg(null);
    const res = await createPosOrder({
      organizationId: slug,
      items: posLines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.qty })),
      type: posType,
      tableId: posType === 'DINE_IN' && posTableId ? posTableId : undefined,
      paymentMethod: posPayment ? (posPayment as 'WALLET' | 'CASH' | 'POS') : undefined,
    });
    setPosBusy(false);
    if ('error' in res && res.error) {
      setPosMsg(res.error);
      return;
    }
    const created = res as any;
    playCashRegisterChime();

    const placedReceipt: PrintableReceiptData = {
      orderId: created.id || String(Date.now()),
      orderNumber: created.orderNumber ? String(created.orderNumber) : undefined,
      storeName: org?.name || 'Restaurant',
      date: new Date(),
      cashierName: 'POS Counter',
      orderType: posType,
      tableName: tables.find((t) => t.id === posTableId)?.name,
      items: posLines.map((l) => ({
        name: l.name,
        quantity: l.qty,
        unitPrice: l.price,
        subtotal: l.price * l.qty,
      })),
      subtotal: posTotal,
      taxAmount: posTax,
      serviceCharge: posService,
      totalAmount: created.totalAmount ?? (posTotal + posTax + posService),
      paymentMethod: posPayment || 'UNPAID (DINE-IN)',
      currencySymbol: '₦',
    };
    setReceiptModalData(placedReceipt);

    setPosLines([]);
    setPosMsg(`Order #${(res as any).orderNumber} placed — ${fmt((res as any).totalAmount)}`);
    await refresh();
  }

  async function refresh() {
    const [d, f] = await Promise.all([
      getRestaurantOSData(slug),
      getFinancialSummary(slug),
    ]);
    if (d) {
      setSettings(d.settings ?? null);
      setMenu(d.menu ?? []);
      setTables(d.tables ?? []);
      setReservations(d.reservations ?? []);
      setTickets(d.tickets ?? []);
      setOrders(d.orders ?? []);
      setInventory(d.inventory ?? []);
      setExpenses(d.expenses ?? []);
    }
    setFinance(f);
  }

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
        await refresh();
      } catch (err: any) {
        // requireMembership throws for non-members â€” show an honest denial.
        if (live) setDenied(err?.message || 'Access denied');
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!loaded || !org) return;
    const interval = setInterval(async () => {
      try {
        const d = await getRestaurantOSData(slug);
        if (d?.tickets) {
          const pending = d.tickets.filter((t: any) => t.status === 'PENDING').length;
          if (previousTicketCountRef.current !== null && pending > previousTicketCountRef.current) {
            playOrderChime();
          }
          previousTicketCountRef.current = pending;
          setTickets(d.tickets);
        }
      } catch {}
    }, 12_000);
    return () => clearInterval(interval);
  }, [loaded, org, slug]);


  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto text-center py-24 text-[12px] font-bold text-slate-400">
        Loading workspaceâ€¦
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">ðŸ½ï¸</p>
        <h1 className="text-lg font-black text-ink">Workspace not found.</h1>
        <p className="text-sm text-slate-500">This kitchen does not exist on CityOS.</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-5xl">ðŸ”’</p>
        <h1 className="text-lg font-black text-ink">Access denied</h1>
        <p className="text-sm text-slate-500">{denied}</p>
        <Link href="/business" className="inline-block px-5 py-2.5 rounded-xl bg-teal-800 text-white text-xs font-black hover:bg-teal-900 transition-colors">
          Back to business
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-600 to-amber-500 text-white flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-ink">{org.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {`RestaurantOS Â· ${style === 'FULL_SERVICE' ? 'Full Service' : style === 'COUNTER' ? 'Fast Food' : 'Eatery'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={switchToPersonal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 hover:text-ink transition-colors shadow-xs"
            title="Switch back to your personal citizen profile"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" /> Personal Account
          </button>
          <Link
            href={`/org/${org.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" /> Public page
          </Link>
          <AudioAlertToggle showTestButton={false} />
          <Pill tone="orange">{tickets.length} open ticket{tickets.length === 1 ? '' : 's'}</Pill>
        </div>
      </div>

      {/* Tab bar â€” style-irrelevant tabs are hidden */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-xl text-[12px] font-black transition-colors whitespace-nowrap',
              tab === t ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-100',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'POS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-3">
            <SectionHead title="Menu" sub="Tap items to add them to the order" />
            {menu.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm font-bold text-slate-500">No menu items yet.</p>
                <p className="text-xs text-slate-400 mt-1">Add items in the Menu tab first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {menu.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => posAdd(m)}
                    disabled={m.isAvailable === false}
                    className={cn(
                      'rounded-2xl border p-3.5 text-left transition-all',
                      m.isAvailable === false
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-100 hover:border-orange-300 hover:shadow-md active:scale-[0.98]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-black text-ink leading-snug">{m.name}</p>
                      {m.isAvailable === false ? <span className="text-[9px] font-black text-rose-500 uppercase">86'd</span> : null}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{m.category}</p>
                    <p className="text-[13px] font-black text-orange-600 mt-1.5">{fmt(m.price)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 sticky top-24">

              <h3 className="text-sm font-black text-ink">Order ticket</h3>

              {/* Order type */}
              <div className="flex gap-2">
                {(['TAKEOUT', 'DINE_IN'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPosType(t)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-[11px] font-black transition-colors',
                      posType === t ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-600',
                    )}
                  >
                    {t === 'TAKEOUT' ? 'Takeout' : 'Dine-in'}
                  </button>
                ))}
              </div>

              {/* Table select (full service) */}
              {posType === 'DINE_IN' && showTables ? (
                <select
                  value={posTableId}
                  onChange={(e) => setPosTableId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-slate-700 bg-white"
                >
                  <option value="">Select tableâ€¦</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{`${t.name} Â· ${t.seats} seats Â· ${t.status}`}</option>
                  ))}
                </select>
              ) : null}

              {/* Lines */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {posLines.length === 0 ? (
                  <p className="text-[12px] text-slate-400 font-medium text-center py-6">Tap menu items to add.</p>
                ) : (
                  posLines.map((l) => (
                    <div key={l.menuItemId} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5">
                      <span className="flex-1 min-w-0 text-[12px] font-black text-ink truncate">{l.name}</span>
                      <button onClick={() => posQty(l.menuItemId, l.qty - 1)} className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-slate-500"><Minus className="w-3 h-3" /></button>
                      <span className="w-6 text-center text-[12px] font-black">{l.qty}</span>
                      <button onClick={() => posQty(l.menuItemId, l.qty + 1)} className="w-6 h-6 rounded-md bg-white flex items-center justify-center text-slate-500"><Plus className="w-3 h-3" /></button>
                      <span className="w-16 text-right text-[12px] font-black text-orange-600">{fmt(l.price * l.qty)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-[12px] font-bold text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between"><span>Subtotal</span><span className="text-ink">{fmt(posTotal)}</span></div>
                {posTax > 0 ? <div className="flex justify-between"><span>Tax</span><span className="text-ink">{fmt(posTax)}</span></div> : null}
                {posService > 0 ? <div className="flex justify-between"><span>Service charge</span><span className="text-ink">{fmt(posService)}</span></div> : null}
                <div className="flex justify-between text-sm pt-1"><span className="font-black text-ink">Total</span><span className="font-black text-orange-600">{fmt(posTotal + posTax + posService)}</span></div>
              </div>

              {/* Payment */}
              <div className="flex gap-2">
                {(['CASH', 'POS', 'WALLET'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPosPayment(posPayment === p ? '' : p)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-[11px] font-black transition-colors',
                      posPayment === p ? 'bg-teal-800 text-white' : 'bg-slate-50 text-slate-600',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-bold text-center">
                {posPayment ? `Customer pays by ${posPayment} now` : 'No payment â€” bill at the end (dine-in)'}
              </p>

              <button
                onClick={placeOrder}
                disabled={posLines.length === 0 || posBusy}
                className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {posBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Place order
              </button>
              {posMsg ? <p className="text-[11px] font-bold text-teal-700 text-center">{posMsg}</p> : null}
              {receiptModalData ? (
                <button
                  type="button"
                  onClick={() => setReceiptModalData({ ...receiptModalData })}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Thermal Receipt
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}


      {tab === 'Kitchen' ? (
        <div className="space-y-4">
          <SectionHead title="Kitchen Display" sub="Live tickets â€” oldest first" />
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <p className="text-sm font-bold text-slate-500">No open tickets.</p>
              <p className="text-xs text-slate-400 mt-1">The kitchen is all caught up.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tickets.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-ink">#{t.orderNumber ?? 'â€”'}</span>
                    <Pill tone={STATUS_TONE[t.status] ?? 'orange'}>{t.status}</Pill>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {`${t.type}${t.tableName ? ` Â· ${t.tableName}` : ''}`}
                  </p>
                  <div className="space-y-1">
                    {t.items.map((i: any) => (
                      <div key={i.id} className="flex justify-between text-[12px] font-bold text-slate-600">
                        <span>{`${i.quantity}Ã— ${i.itemName}`}</span>
                        {i.notes ? <span className="text-amber-600">{i.notes}</span> : null}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[12px] font-black text-ink border-t border-slate-100 pt-2">
                    <span>{t.paymentMethod ? `Paid by ${t.paymentMethod}` : 'Unpaid'}</span>
                    <span>{fmt(t.totalAmount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {t.status === 'PENDING' ? (
                      <button onClick={async () => { await updateOrderStatus(t.id, 'PREPARING'); await refresh(); }} className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-[10px] font-black">Start preparing</button>
                    ) : null}
                    {t.status === 'PREPARING' ? (
                      <button onClick={async () => { await updateOrderStatus(t.id, 'READY'); await refresh(); }} className="px-3 py-1.5 rounded-lg bg-teal-700 text-white text-[10px] font-black">Mark ready</button>
                    ) : null}
                    {t.status === 'READY' ? (
                      <button onClick={async () => { await updateOrderStatus(t.id, 'COMPLETED'); await refresh(); }} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black">Served / complete</button>
                    ) : null}
                    {t.status !== 'COMPLETED' ? (
                      <button onClick={async () => { await updateOrderStatus(t.id, 'CANCELLED'); await refresh(); }} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black">Cancel</button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setReceiptModalData({
                          orderId: t.id,
                          orderNumber: t.orderNumber ? String(t.orderNumber) : t.id.slice(0, 8),
                          storeName: org?.name || 'Restaurant Kitchen',
                          date: new Date(),
                          orderType: t.type as any,
                          tableName: t.tableName || undefined,
                          items: t.items.map((i: any) => ({
                            name: i.itemName,
                            quantity: i.quantity,
                            unitPrice: Number((i as any).unitPrice || 0),
                            subtotal: Number((i as any).unitPrice || 0) * i.quantity,
                            notes: i.notes || undefined,
                          })),
                          subtotal: t.totalAmount,
                          totalAmount: t.totalAmount,
                          paymentMethod: t.paymentMethod || 'UNPAID',
                          currencySymbol: '₦',
                          footerMessage: 'Kitchen Order Ticket',
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-black inline-flex items-center gap-1 transition-colors"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Bill</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}


      {tab === 'Menu' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <SectionHead title="Menu items" sub="86 an item to stop selling it instantly" />
            {menu.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm font-bold text-slate-500">No menu items yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {menu.map((m) => (
                  <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-ink truncate">{m.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{`${m.category} Â· ${m.addons.length} addon${m.addons.length === 1 ? '' : 's'} Â· ${m.variants.length} variant${m.variants.length === 1 ? '' : 's'}`}</p>
                    </div>
                    <span className="text-[13px] font-black text-orange-600">{fmt(m.price)}</span>
                    <button
                      onClick={async () => { await toggleMenuItemAvailability(m.id); await refresh(); }}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors',
                        m.isAvailable === false ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {m.isAvailable === false ? 'Restore' : "86 it"}
                    </button>
                    <button onClick={async () => { if (confirm(`Delete ${m.name}?`)) { await deleteMenuItem(m.id); await refresh(); } }} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 h-fit">
            <h3 className="text-sm font-black text-ink">Add menu item</h3>
            <MenuItemForm slug={slug} onDone={refresh} />
          </div>
        </div>
      ) : null}


      {tab === 'Inventory' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <SectionHead title="Stock" sub="Ingredients and resale stock â€” restock or record usage" />
            {inventory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm font-bold text-slate-500">No stock items yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {inventory.map((i) => {
                  const low = i.quantity <= i.lowStockLevel;
                  return (
                    <div key={i.id} className={cn('rounded-2xl border p-3.5 flex items-center gap-3', low ? 'border-amber-200 bg-amber-50/50' : 'bg-white border-slate-100')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-ink truncate">{i.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {`${i.quantity} ${i.unit} left Â· min ${i.lowStockLevel}`}
                          {low ? ' Â· LOW STOCK' : ''}
                        </p>
                      </div>
                      <button onClick={async () => { await adjustStock(i.id, 1, 'Restock'); await refresh(); }} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={async () => { await adjustStock(i.id, -1, 'Usage'); await refresh(); }} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"><Minus className="w-3.5 h-3.5" /></button>
                      <button onClick={async () => { if (confirm(`Delete ${i.name}?`)) { await deleteInventoryItem(i.id); await refresh(); } }} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 h-fit">
            <h3 className="text-sm font-black text-ink">Add stock item</h3>
            <InventoryForm slug={slug} onDone={refresh} />
          </div>
        </div>
      ) : null}


      {tab === 'Finance' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Revenue today" value={fmt(finance?.today.revenue ?? 0)} delta={`${finance?.today.orders ?? 0} paid order(s)`} tone="teal" />
            <StatTile label="Average ticket" value={fmt(finance?.today.averageTicket ?? 0)} delta="today" tone="blue" />
            <StatTile label="Expenses today" value={fmt(finance?.expensesToday ?? 0)} delta="recorded costs" tone="orange" />
            <StatTile label="Week net (rev âˆ’ exp)" value={fmt(finance?.week.net ?? 0)} delta={`${finance?.week.revenue ?? 0} revenue`} tone="emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 lg:col-span-2">
              <SectionHead title="Payments today" sub="By method" />
              <div className="space-y-2 mt-2">
                {(['WALLET', 'CASH', 'POS'] as const).map((m) => (
                  <div key={m} className="flex justify-between text-[13px] font-bold text-slate-600">
                    <span>{m === 'WALLET' ? 'CityPay wallet' : m === 'CASH' ? 'Cash' : 'POS transfer'}</span>
                    <span className="text-ink">{fmt(finance?.today.revenueByMethod?.[m] ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 h-fit">
              <h3 className="text-sm font-black text-ink">Record expense</h3>
              <ExpenseForm slug={slug} onDone={refresh} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <SectionHead title="Recent expenses" sub="All recorded costs" />
            <div className="space-y-2 mt-2">
              {expenses.length === 0 ? (
                <p className="text-[12px] text-slate-400 font-medium py-4 text-center">No expenses recorded yet.</p>
              ) : (
                expenses.slice(0, 10).map((e) => (
                  <div key={e.id} className="flex justify-between text-[12px] font-bold text-slate-600">
                    <span className="capitalize">{`${e.category}${e.note ? ` â€” ${e.note}` : ''}`}</span>
                    <span className="text-rose-500">âˆ’{fmt(e.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}


      {tab === 'Tables' ? (
        <div className="space-y-4">
          <SectionHead title="Floor plan" sub="Tap a table to cycle its status" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={async () => {
                  const next = t.status === 'available' ? 'occupied' : t.status === 'occupied' ? 'reserved' : 'available';
                  await updateTableStatus(t.id, next);
                  await refresh();
                }}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all',
                  t.status === 'available' ? 'bg-white border-emerald-200' : t.status === 'occupied' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200',
                )}
              >
                <p className="text-[13px] font-black text-ink">{t.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 capitalize">{`${t.status} Â· ${t.seats} seats`}</p>
              </button>
            ))}
            {tables.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <p className="text-sm font-bold text-slate-500">No tables yet.</p>
              </div>
            ) : null}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 max-w-sm space-y-3">
            <h3 className="text-sm font-black text-ink">Add table</h3>
            <TableForm slug={slug} onDone={refresh} />
          </div>
        </div>
      ) : null}

      {tab === 'Reservations' ? (
        <div className="space-y-4">
          <SectionHead title="Reservations" sub="Walk-in and online bookings" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              {reservations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                  <p className="text-sm font-bold text-slate-500">No reservations yet.</p>
                </div>
              ) : (
                reservations.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black text-ink">{`${r.customerName ?? 'Guest'} Â· ${r.partySize} pax`}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {`${new Date(r.scheduledAt).toLocaleString()}${r.tableId ? ` Â· ${tables.find((t) => t.id === r.tableId)?.name ?? 'table'}` : ''}`}
                      </p>
                    </div>
                    <Pill tone={r.status === 'seated' ? 'green' : r.status === 'cancelled' ? 'red' : 'orange'}>{r.status}</Pill>
                    {r.status === 'pending' ? (
                      <button onClick={async () => { await updateReservationStatus(r.id, 'confirmed'); await refresh(); }} className="px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-[10px] font-black">Confirm</button>
                    ) : null}
                    {r.status === 'confirmed' ? (
                      <button onClick={async () => { await updateReservationStatus(r.id, 'seated'); await refresh(); }} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black">Seat</button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 h-fit">
              <h3 className="text-sm font-black text-ink">New reservation</h3>
              <ReservationForm slug={slug} tables={tables} onDone={refresh} />
            </div>
          </div>
        </div>
      ) : null}


      {tab === 'Settings' ? (
        <div className="max-w-xl space-y-4">
          <SectionHead title="RestaurantOS settings" sub="Operating style, pricing and payments" />
          <SettingsForm slug={slug} settings={settings} onDone={refresh} />
        </div>
      ) : null}

      {receiptModalData && (
        <ThermalReceiptModal
          initialData={receiptModalData}
          onClose={() => setReceiptModalData(null)}
        />
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

function MenuItemForm({ slug, onDone }: { slug: string; onDone: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Mains');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name (e.g. Party Jollof)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (e.g. 4500)" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (Mains, Drinks, Grills)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <button
        onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await createMenuItem({ organizationId: slug, name, price: Number(price) || 0, category });
          setBusy(false);
          if ('error' in res && res.error) { setMsg(res.error); return; }
          setName(''); setPrice('');
          setMsg('Item added.');
          await onDone();
        }}
        disabled={busy || !name.trim()}
        className="w-full h-10 rounded-xl bg-orange-600 text-white text-[12px] font-black disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Add item
      </button>
      {msg ? <p className="text-[10px] font-bold text-slate-500">{msg}</p> : null}
    </div>
  );
}

function InventoryForm({ slug, onDone }: { slug: string; onDone: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('unit');
  const [qty, setQty] = useState('');
  const [min, setMin] = useState('5');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item (e.g. Rice â€” bag)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (kg, crate, litre)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <div className="flex gap-2">
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
        <input value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      </div>
      <button
        onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await createInventoryItem({ organizationId: slug, name, unit, quantity: Number(qty) || 0, lowStockLevel: Number(min) || 5 });
          setBusy(false);
          if ('error' in res && res.error) { setMsg(res.error); return; }
          setName(''); setQty('');
          setMsg('Stock item added.');
          await onDone();
        }}
        disabled={busy || !name.trim()}
        className="w-full h-10 rounded-xl bg-orange-600 text-white text-[12px] font-black disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Add stock
      </button>
      {msg ? <p className="text-[10px] font-bold text-slate-500">{msg}</p> : null}
    </div>
  );
}


function ExpenseForm({ slug, onDone }: { slug: string; onDone: () => Promise<void> }) {
  const [category, setCategory] = useState('ingredients');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2.5">
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-slate-700 bg-white">
        {['ingredients', 'gas', 'staff', 'rent', 'utilities', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <button
        onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await addExpense({ organizationId: slug, category, amount: Number(amount) || 0, note });
          setBusy(false);
          if ('error' in res && res.error) { setMsg(res.error); return; }
          setAmount(''); setNote('');
          setMsg('Expense recorded.');
          await onDone();
        }}
        disabled={busy || !(Number(amount) > 0)}
        className="w-full h-10 rounded-xl bg-orange-600 text-white text-[12px] font-black disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Record expense
      </button>
      {msg ? <p className="text-[10px] font-bold text-slate-500">{msg}</p> : null}
    </div>
  );
}

function TableForm({ slug, onDone }: { slug: string; onDone: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('4');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Table name (e.g. T1, Window)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <input value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="Seats" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <button
        onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await createTable({ organizationId: slug, name, seats: Number(seats) || 4 });
          setBusy(false);
          if ('error' in res && res.error) { setMsg(res.error); return; }
          setName('');
          setMsg('Table added.');
          await onDone();
        }}
        disabled={busy || !name.trim()}
        className="w-full h-10 rounded-xl bg-orange-600 text-white text-[12px] font-black disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Add table
      </button>
      {msg ? <p className="text-[10px] font-bold text-slate-500">{msg}</p> : null}
    </div>
  );
}


function ReservationForm({ slug, tables, onDone }: { slug: string; tables: TableRow[]; onDone: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [party, setParty] = useState('2');
  const [when, setWhen] = useState('');
  const [tableId, setTableId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <div className="flex gap-2">
        <input value={party} onChange={(e) => setParty(e.target.value)} placeholder="Party size" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
        <input value={when} onChange={(e) => setWhen(e.target.value)} type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-slate-700 focus:outline-none focus:border-orange-300" />
      </div>
      <select value={tableId} onChange={(e) => setTableId(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-slate-700 bg-white">
        <option value="">No table preference</option>
        {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button
        onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await createReservation({
            organizationId: slug, customerName: name, customerPhone: phone,
            partySize: Number(party) || 2, scheduledAt: when || new Date().toISOString(),
            tableId: tableId || undefined,
          });
          setBusy(false);
          if ('error' in res && res.error) { setMsg(res.error); return; }
          setName(''); setPhone(''); setWhen('');
          setMsg('Reservation created.');
          await onDone();
        }}
        disabled={busy}
        className="w-full h-10 rounded-xl bg-orange-600 text-white text-[12px] font-black disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Create reservation
      </button>
      {msg ? <p className="text-[10px] font-bold text-slate-500">{msg}</p> : null}
    </div>
  );
}


function SettingsForm({ slug, settings, onDone }: { slug: string; settings: Settings | null; onDone: () => Promise<void> }) {
  const [style, setStyle] = useState(settings?.serviceStyle ?? 'HYBRID');
  const [tax, setTax] = useState(String(settings?.taxRate ?? 0));
  const [service, setService] = useState(String(settings?.serviceCharge ?? 0));
  const [hours, setHours] = useState(settings?.openingHours ?? '');
  const [walkIns, setWalkIns] = useState(settings?.acceptsWalkIns ?? true);
  const [walletSettle, setWalletSettle] = useState(settings?.walletSettlementEnabled ?? false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Operating style</p>
        <div className="flex gap-2">
          {(['FULL_SERVICE', 'COUNTER', 'HYBRID'] as const).map((s) => (
            <button key={s} onClick={() => setStyle(s)} className={cn('flex-1 py-2 rounded-xl text-[10px] font-black transition-colors', style === s ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-600')}>
              {s === 'FULL_SERVICE' ? 'Restaurant' : s === 'COUNTER' ? 'Fast food' : 'Eatery'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input value={tax} onChange={(e) => setTax(e.target.value)} placeholder="Tax %" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
        <input value={service} onChange={(e) => setService(e.target.value)} placeholder="Service charge %" inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      </div>
      <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Opening hours (e.g. 8:00 AM - 10:00 PM)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-bold text-ink focus:outline-none focus:border-orange-300" />
      <label className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
        <input type="checkbox" checked={walkIns} onChange={(e) => setWalkIns(e.target.checked)} /> Accept walk-in customers
      </label>
      <label className="flex items-center gap-2 text-[12px] font-bold text-slate-600">
        <input type="checkbox" checked={walletSettle} onChange={(e) => setWalletSettle(e.target.checked)} /> Settle sales to CityPay wallet
      </label>
      <button
        onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await updateRestaurantOSSettings(slug, {
            serviceStyle: style as 'FULL_SERVICE' | 'COUNTER' | 'HYBRID',
            taxRate: Number(tax) || 0,
            serviceCharge: Number(service) || 0,
            openingHours: hours,
            acceptsWalkIns: walkIns,
            walletSettlementEnabled: walletSettle,
          });
          setBusy(false);
          if ('error' in res && res.error) { setMsg(res.error); return; }
          setMsg('Settings saved.');
          await onDone();
        }}
        disabled={busy}
        className="w-full h-10 rounded-xl bg-teal-800 text-white text-[12px] font-black disabled:opacity-50"
      >
        {busy ? 'Savingâ€¦' : 'Save settings'}
      </button>
      {msg ? <p className="text-[10px] font-bold text-slate-500">{msg}</p> : null}
    </div>
  );
}
