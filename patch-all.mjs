import fs from 'fs';

// -------------------------------------------------------------
// 1. lib/actions/retail.ts
// -------------------------------------------------------------
let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');

const requireLocationContextCode = `
async function resolveLocationContext(organizationId: string, locationId?: string | null) {
  const locations = await db.orm.public.Location.where({ organizationId }).all();
  if (locations.length > 0) {
    if (!locationId) throw new Error('An active location is required for this operation.');
    const loc = locations.find(l => l.id === locationId);
    if (!loc) throw new Error('Location does not belong to this organization.');
    return loc;
  }
  return null;
}

async function getOrInitLocationStock(tx: any, organizationId: string, locationId: string, productId: string) {
  let stock = await tx.orm.public.RetailLocationStock.where({ locationId, productId }).all().first();
  if (!stock) {
    stock = await tx.orm.public.RetailLocationStock.create({
      organizationId,
      locationId,
      productId,
      stockQuantity: 0,
      lowStockLevel: null
    });
  }
  return stock;
}
`;

retail = retail.replace('// Categories', requireLocationContextCode + '\\n// Categories');

// openShift signature
retail = retail.replace(
  'export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number }) {',
  'export async function openShift(input: { organizationId: string; registerId: string; openingFloat: number; locationId?: string | null }) {'
);
retail = retail.replace(
  'const shift = await db.orm.public.RetailShift.create({',
  'const shift = await db.orm.public.RetailShift.create({\\n      locationId: input.locationId,'
);

// createOrder signature
retail = retail.replace(
  'shiftId?: string;',
  'shiftId?: string; locationId?: string | null;'
);
retail = retail.replace(
  'shiftId: input.shiftId,',
  'shiftId: input.shiftId,\\n        locationId: input.locationId,'
);

// adjustStock signature and logic
retail = retail.replace(
  'export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string) {',
  'export async function adjustStock(productId: string, delta: number, note?: string, locationId?: string | null) {'
);
retail = retail.replace(
  'if (locationId) {',
  'const loc = await resolveLocationContext(product.organizationId, locationId).catch(e => { throw e; });\\n    if (loc) {'
);
retail = retail.replace(
  'await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });',
  `if (loc) {
        const stock = await getOrInitLocationStock(tx, product.organizationId, loc.id, productId);
        const next = stock.stockQuantity + delta;
        if (next < 0) throw new Error('Stock cannot go below zero.');
        await tx.orm.public.RetailLocationStock.where({ id: stock.id }).update({ stockQuantity: next });
        await tx.orm.public.RetailStockMovement.create({
          organizationId: current.organizationId,
          locationId: loc.id,
          productId,
          delta,
          beforeQty: stock.stockQuantity,
          afterQty: next,
          reason: 'ADJUSTMENT',
          note: note ?? null,
          recordedById: membership.id,
        });
      } else {
        await tx.orm.public.RetailProduct.where({ id: productId }).update({ stockQuantity: next });`
);
retail = retail.replace(
  'await txCheckLowStock(current);',
  'await txCheckLowStock(current);\\n      }'
);

// createRegister
retail = retail.replace(
  'export async function createRegister(organizationId: string, name: string) {',
  'export async function createRegister(organizationId: string, name: string, locationId?: string | null) {'
);
retail = retail.replace(
  'const register = await db.orm.public.RetailRegister.create({ organizationId, name, isActive: true });',
  'const loc = await resolveLocationContext(organizationId, locationId).catch(e => { throw e; });\\n    const register = await db.orm.public.RetailRegister.create({ organizationId, locationId: loc ? loc.id : null, name, isActive: true });'
);

// queries signature & body
retail = retail.replace('export async function getProducts(organizationId: string) {', 'export async function getProducts(organizationId: string, locationId?: string | null) {');
retail = retail.replace('export async function getRegisters(organizationId: string) {', 'export async function getRegisters(organizationId: string, locationId?: string | null) {');
retail = retail.replace('export async function getOpenShift(organizationId: string) {', 'export async function getOpenShift(organizationId: string, locationId?: string | null) {');
retail = retail.replace('export async function getShiftHistory(organizationId: string) {', 'export async function getShiftHistory(organizationId: string, locationId?: string | null) {');
retail = retail.replace('export async function getOrders(organizationId: string) {', 'export async function getOrders(organizationId: string, locationId?: string | null) {');
retail = retail.replace('export async function getShopDashboardData(organizationId: string) {', 'export async function getShopDashboardData(organizationId: string, locationId?: string | null) {');

retail = retail.replace(
  'const registers = await db.orm.public.RetailRegister.where({ organizationId }).all();',
  'const registers = await db.orm.public.RetailRegister.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);
retail = retail.replace(
  'const shifts = await db.orm.public.RetailShift.where({ organizationId }).all();',
  'const shifts = await db.orm.public.RetailShift.where(locationId ? { organizationId, locationId } : { organizationId }).all();'
);
// getOrders
let ordersMatch1 = retail.indexOf('const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();');
if (ordersMatch1 > -1) {
  retail = retail.substring(0, ordersMatch1) + 'const orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();' + retail.substring(ordersMatch1 + 79);
}
// getShopDashboardData
let ordersMatch2 = retail.indexOf('const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();');
if (ordersMatch2 > -1) {
  retail = retail.substring(0, ordersMatch2) + 'const orders = await db.orm.public.RetailOrder.where(locationId ? { organizationId, locationId } : { organizationId }).all();' + retail.substring(ordersMatch2 + 79);
}

retail = retail.replace(
  'const registers = await getRegisters(organizationId);',
  'const registers = await getRegisters(organizationId, locationId);'
);

// fix \\n
retail = retail.replace(/\\\\n/g, '\\n');

fs.writeFileSync('lib/actions/retail.ts', retail);

// -------------------------------------------------------------
// 2. components/retail/POSTerminal.tsx
// -------------------------------------------------------------
let pos = fs.readFileSync('components/retail/POSTerminal.tsx', 'utf8');
pos = pos.replace(
  'export default function POSTerminal({ organizationId, products, shiftId, onOrderComplete }: {\\n  organizationId: string;\\n  products: Product[];\\n  shiftId: string;\\n  onOrderComplete: () => void;\\n}) {',
  'export default function POSTerminal({ organizationId, locationId, products, shiftId, onOrderComplete }: {\\n  organizationId: string;\\n  locationId?: string | null;\\n  products: Product[];\\n  shiftId: string;\\n  onOrderComplete: () => void;\\n}) {'
);
pos = pos.replace(
  'const res = await createOrder({\\n          organizationId,\\n          shiftId,',
  'const res = await createOrder({\\n          organizationId,\\n          locationId,\\n          shiftId,'
);
fs.writeFileSync('components/retail/POSTerminal.tsx', pos);

// -------------------------------------------------------------
// 3. components/retail/InventoryManager.tsx
// -------------------------------------------------------------
let inv = fs.readFileSync('components/retail/InventoryManager.tsx', 'utf8');
inv = inv.replace(
  'export default function InventoryManager({ organizationId, products, categories, onChanged, symbol = "$" }: {\\n  organizationId: string;\\n  products: Product[];\\n  categories: Category[];\\n  onChanged: () => void;\\n  symbol?: string;\\n}) {',
  'export default function InventoryManager({ organizationId, locationId, products, categories, onChanged, symbol = "$" }: {\\n  organizationId: string;\\n  locationId?: string | null;\\n  products: Product[];\\n  categories: Category[];\\n  onChanged: () => void;\\n  symbol?: string;\\n}) {'
);
inv = inv.replace(
  'const res = await adjustStock(item.id, qty, reason);',
  'const res = await adjustStock(item.id, qty, reason, locationId ?? null);'
);
fs.writeFileSync('components/retail/InventoryManager.tsx', inv);

// -------------------------------------------------------------
// 4. components/retail/ShopDashboard.tsx
// -------------------------------------------------------------
let dash = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
dash = dash.replace(
  'const [sessionEmail, setSessionEmail] = useState("");',
  'const [sessionEmail, setSessionEmail] = useState("");\\n  const [locations, setLocations] = useState<any[]>([]);\\n  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);'
);
dash = dash.replace(
  'const [dash, prods, cats, regs] = await Promise.all([\\n      getShopDashboardData(organizationId),\\n      getProducts(organizationId),\\n      getCategories(organizationId),\\n      getRegisters(organizationId),\\n    ]);',
  `const locs = await getLocations(organizationId);\\n    setLocations(locs);\\n    const locToUse = activeLocationId || (locs.length > 0 ? locs[0].id : null);\\n    if (!activeLocationId && locToUse) setActiveLocationId(locToUse);\\n\\n    const [dash, prods, cats, regs] = await Promise.all([\\n      getShopDashboardData(organizationId, locToUse),\\n      getProducts(organizationId, locToUse),\\n      getCategories(organizationId),\\n      getRegisters(organizationId, locToUse),\\n    ]);`
);
const oldSidebarHeader = `<div className="flex items-center gap-3">\\n            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-brand-600/30 flex-shrink-0">S</div>\\n            <div className="leading-tight">\\n              <span className="font-black text-lg text-ink tracking-tight block">CityMart</span>\\n              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Suite</span>\\n            </div>\\n          </div>`;
const newSidebarHeader = `<div className="flex flex-col gap-3 w-full">\\n            <div className="flex items-center gap-3">\\n              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-brand-600/30 flex-shrink-0">S</div>\\n              <div className="leading-tight">\\n                <span className="font-black text-lg text-ink tracking-tight block">CityMart</span>\\n                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Suite</span>\\n              </div>\\n            </div>\\n            {locations.length > 0 && (\\n              <div className="mt-2 w-full">\\n                <select\\n                  value={activeLocationId || ""}\\n                  onChange={(e) => {\\n                    setActiveLocationId(e.target.value);\\n                    setLoading(true);\\n                  }}\\n                  className={selectCls}\\n                >\\n                  <option value="" disabled>Select Location</option>\\n                  {locations.map((loc) => (\\n                    <option key={loc.id} value={loc.id}>{loc.name}</option>\\n                  ))}\\n                </select>\\n              </div>\\n            )}\\n          </div>`;
dash = dash.replace(oldSidebarHeader, newSidebarHeader);

dash = dash.replace(
  '<POSTerminal organizationId={organizationId} products={products} shiftId={openShiftData.id} onOrderComplete={loadAll} />',
  '<POSTerminal organizationId={organizationId} locationId={activeLocationId} products={products} shiftId={openShiftData.id} onOrderComplete={loadAll} />'
);
dash = dash.replace(
  '<OpenShiftPrompt organizationId={organizationId} registers={registers} currentUserId={currentUserId} onOpened={loadAll} symbol={currencySymbol} />',
  '<OpenShiftPrompt organizationId={organizationId} locationId={activeLocationId} registers={registers} currentUserId={currentUserId} onOpened={loadAll} symbol={currencySymbol} />'
);
dash = dash.replace(
  '<InventoryManager organizationId={organizationId} products={products} categories={categories} onChanged={loadAll} symbol={currencySymbol} />',
  '<InventoryManager organizationId={organizationId} locationId={activeLocationId} products={products} categories={categories} onChanged={loadAll} symbol={currencySymbol} />'
);
dash = dash.replace(
  '<ShiftsTab organizationId={organizationId} registers={registers} openShift={openShiftData} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} setActiveMenu={setActiveMenu} setSalesShiftFilter={setSalesShiftFilter} />',
  '<ShiftsTab organizationId={organizationId} locationId={activeLocationId} registers={registers} openShift={openShiftData} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} setActiveMenu={setActiveMenu} setSalesShiftFilter={setSalesShiftFilter} />'
);
dash = dash.replace(
  '<SalesReturnsTab organizationId={organizationId} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} salesShiftFilter={salesShiftFilter} setSalesShiftFilter={setSalesShiftFilter} />',
  '<SalesReturnsTab organizationId={organizationId} locationId={activeLocationId} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} salesShiftFilter={salesShiftFilter} setSalesShiftFilter={setSalesShiftFilter} />'
);
dash = dash.replace(
  'useEffect(() => {\\n    loadAll();\\n    const notifTimer = setInterval(loadNotifications, 15_000);',
  'useEffect(() => {\\n    loadAll();\\n  }, [activeLocationId]);\\n\\n  useEffect(() => {\\n    const notifTimer = setInterval(loadNotifications, 15_000);'
);

dash = dash.replace(
  'function ShiftsTab({ organizationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "$", setActiveMenu, setSalesShiftFilter }: {\\n    organizationId: string; registers: any[]; openShift: any | null; currentUserId: string; onChanged: () => void; symbol?: string; setActiveMenu: (m: string) => void; setSalesShiftFilter: (id: string | null) => void;\\n  }) {',
  'function ShiftsTab({ organizationId, locationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "$", setActiveMenu, setSalesShiftFilter }: {\\n    organizationId: string; locationId?: string | null; registers: any[]; openShift: any | null; currentUserId: string; onChanged: () => void; symbol?: string; setActiveMenu: (m: string) => void; setSalesShiftFilter: (id: string | null) => void;\\n  }) {'
);
dash = dash.replace(
  'const res = await createRegister(organizationId, newRegName);',
  'const res = await createRegister(organizationId, newRegName, locationId);'
);

dash = dash.replace(
  'function OpenShiftPrompt({ organizationId, registers, currentUserId, onOpened, symbol = "$" }: {\\n  organizationId: string; registers: any[]; currentUserId: string; onOpened: () => void; symbol?: string;\\n}) {',
  'function OpenShiftPrompt({ organizationId, locationId, registers, currentUserId, onOpened, symbol = "$" }: {\\n  organizationId: string; locationId?: string | null; registers: any[]; currentUserId: string; onOpened: () => void; symbol?: string;\\n}) {'
);
dash = dash.replace(
  'const res = await openShift({ organizationId, registerId, openingFloat: num });',
  'const res = await openShift({ organizationId, registerId, openingFloat: num, locationId });'
);
dash = dash.replace(
  'const res = await createRegister(organizationId, newRegisterName);',
  'const res = await createRegister(organizationId, newRegisterName, locationId);'
);

dash = dash.replace(
  'function SalesReturnsTab({ organizationId, currentUserId, onChanged, symbol = "$", salesShiftFilter, setSalesShiftFilter }: {\\n    organizationId: string; currentUserId: string; onChanged: () => void; symbol?: string; salesShiftFilter?: string | null; setSalesShiftFilter?: (id: string | null) => void;\\n  }) {',
  'function SalesReturnsTab({ organizationId, locationId, currentUserId, onChanged, symbol = "$", salesShiftFilter, setSalesShiftFilter }: {\\n    organizationId: string; locationId?: string | null; currentUserId: string; onChanged: () => void; symbol?: string; salesShiftFilter?: string | null; setSalesShiftFilter?: (id: string | null) => void;\\n  }) {'
);
dash = dash.replace(
  'const rows = await getOrders(organizationId);',
  'const rows = await getOrders(organizationId, locationId);'
);

fs.writeFileSync('components/retail/ShopDashboard.tsx', dash);
console.log('Patched cleanly!');
