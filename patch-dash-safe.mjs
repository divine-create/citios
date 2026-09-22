import fs from 'fs';

let dash = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');
dash = dash.replace(
  'const [sessionEmail, setSessionEmail] = useState("");',
  'const [sessionEmail, setSessionEmail] = useState("");\n  const [locations, setLocations] = useState<any[]>([]);\n  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);'
);
dash = dash.replace(
  /const \[dash, prods, cats, regs\] = await Promise\.all\(\[\s+getShopDashboardData\(organizationId\),\s+getProducts\(organizationId\),\s+getCategories\(organizationId\),\s+getRegisters\(organizationId\),\s+\]\);/,
  `const locs = await getLocations(organizationId);
    setLocations(locs);
    const locToUse = activeLocationId || (locs.length > 0 ? locs[0].id : null);
    if (!activeLocationId && locToUse) setActiveLocationId(locToUse);

    const [dash, prods, cats, regs] = await Promise.all([
      getShopDashboardData(organizationId, locToUse),
      getProducts(organizationId, locToUse),
      getCategories(organizationId),
      getRegisters(organizationId, locToUse),
    ]);`
);
const oldSidebarHeader = `<div className="flex items-center gap-3">\n            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-brand-600/30 flex-shrink-0">S</div>\n            <div className="leading-tight">\n              <span className="font-black text-lg text-ink tracking-tight block">CityMart</span>\n              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Suite</span>\n            </div>\n          </div>`;
const newSidebarHeader = `<div className="flex flex-col gap-3 w-full">\n            <div className="flex items-center gap-3">\n              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-brand-600/30 flex-shrink-0">S</div>\n              <div className="leading-tight">\n                <span className="font-black text-lg text-ink tracking-tight block">CityMart</span>\n                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Suite</span>\n              </div>\n            </div>\n            {locations.length > 0 && (\n              <div className="mt-2 w-full">\n                <select\n                  value={activeLocationId || ""}\n                  onChange={(e) => {\n                    setActiveLocationId(e.target.value);\n                    setLoading(true);\n                  }}\n                  className={selectCls}\n                >\n                  <option value="" disabled>Select Location</option>\n                  {locations.map((loc) => (\n                    <option key={loc.id} value={loc.id}>{loc.name}</option>\n                  ))}\n                </select>\n              </div>\n            )}\n          </div>`;
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
  'useEffect(() => {\n    loadAll();\n    const notifTimer = setInterval(loadNotifications, 15_000);',
  'useEffect(() => {\n    loadAll();\n  }, [activeLocationId]);\n\n  useEffect(() => {\n    const notifTimer = setInterval(loadNotifications, 15_000);'
);

dash = dash.replace(
  'function ShiftsTab({ organizationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "$", setActiveMenu, setSalesShiftFilter }: {\n    organizationId: string; registers: any[]; openShift: any | null; currentUserId: string; onChanged: () => void; symbol?: string; setActiveMenu: (m: string) => void; setSalesShiftFilter: (id: string | null) => void;\n  }) {',
  'function ShiftsTab({ organizationId, locationId, registers, openShift: openShiftData, currentUserId, onChanged, symbol = "$", setActiveMenu, setSalesShiftFilter }: {\n    organizationId: string; locationId?: string | null; registers: any[]; openShift: any | null; currentUserId: string; onChanged: () => void; symbol?: string; setActiveMenu: (m: string) => void; setSalesShiftFilter: (id: string | null) => void;\n  }) {'
);
dash = dash.replace(
  'const res = await createRegister(organizationId, newRegName);',
  'const res = await createRegister(organizationId, newRegName, locationId);'
);

dash = dash.replace(
  'function OpenShiftPrompt({ organizationId, registers, currentUserId, onOpened, symbol = "$" }: {\n  organizationId: string; registers: any[]; currentUserId: string; onOpened: () => void; symbol?: string;\n}) {',
  'function OpenShiftPrompt({ organizationId, locationId, registers, currentUserId, onOpened, symbol = "$" }: {\n  organizationId: string; locationId?: string | null; registers: any[]; currentUserId: string; onOpened: () => void; symbol?: string;\n}) {'
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
  'function SalesReturnsTab({ organizationId, currentUserId, onChanged, symbol = "$", salesShiftFilter, setSalesShiftFilter }: {\n    organizationId: string; currentUserId: string; onChanged: () => void; symbol?: string; salesShiftFilter?: string | null; setSalesShiftFilter?: (id: string | null) => void;\n  }) {',
  'function SalesReturnsTab({ organizationId, locationId, currentUserId, onChanged, symbol = "$", salesShiftFilter, setSalesShiftFilter }: {\n    organizationId: string; locationId?: string | null; currentUserId: string; onChanged: () => void; symbol?: string; salesShiftFilter?: string | null; setSalesShiftFilter?: (id: string | null) => void;\n  }) {'
);
dash = dash.replace(
  'const rows = await getOrders(organizationId);',
  'const rows = await getOrders(organizationId, locationId);'
);

fs.writeFileSync('components/retail/ShopDashboard.tsx', dash);
console.log('Patched ShopDashboard safely');
