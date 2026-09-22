import fs from 'fs';

let content = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');

// 1. Add activeLocationId state
content = content.replace(
  /const \[sessionEmail, setSessionEmail\] = useState\(""\);/,
  `const [sessionEmail, setSessionEmail] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);`
);

// 2. Load locations in loadAll
content = content.replace(
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

// 3. Render Location Selector in sidebar (under store name)
const oldSidebarHeader = `<div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-brand-600/30 flex-shrink-0">S</div>
            <div className="leading-tight">
              <span className="font-black text-lg text-ink tracking-tight block">CityMart</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Suite</span>
            </div>
          </div>`;

const newSidebarHeader = `<div className="flex flex-col gap-3 w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm shadow-brand-600/30 flex-shrink-0">S</div>
              <div className="leading-tight">
                <span className="font-black text-lg text-ink tracking-tight block">CityMart</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Retail Suite</span>
              </div>
            </div>
            {locations.length > 0 && (
              <div className="mt-2 w-full">
                <select
                  value={activeLocationId || ""}
                  onChange={(e) => {
                    setActiveLocationId(e.target.value);
                    setLoading(true);
                  }}
                  className={selectCls}
                >
                  <option value="" disabled>Select Location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>`;

content = content.replace(oldSidebarHeader, newSidebarHeader);

// 4. Pass activeLocationId to child components
content = content.replace(
  /<POSTerminal organizationId=\{organizationId\} products=\{products\} shiftId=\{openShiftData\.id\} onOrderComplete=\{loadAll\} \/>/g,
  '<POSTerminal organizationId={organizationId} locationId={activeLocationId} products={products} shiftId={openShiftData.id} onOrderComplete={loadAll} />'
);

content = content.replace(
  /<OpenShiftPrompt organizationId=\{organizationId\} registers=\{registers\} currentUserId=\{currentUserId\} onOpened=\{loadAll\} symbol=\{currencySymbol\} \/>/g,
  '<OpenShiftPrompt organizationId={organizationId} locationId={activeLocationId} registers={registers} currentUserId={currentUserId} onOpened={loadAll} symbol={currencySymbol} />'
);

content = content.replace(
  /<InventoryManager organizationId=\{organizationId\} products=\{products\} categories=\{categories\} onChanged=\{loadAll\} symbol=\{currencySymbol\} \/>/g,
  '<InventoryManager organizationId={organizationId} locationId={activeLocationId} products={products} categories={categories} onChanged={loadAll} symbol={currencySymbol} />'
);

content = content.replace(
  /<ShiftsTab organizationId=\{organizationId\} registers=\{registers\} openShift=\{openShiftData\} currentUserId=\{currentUserId\} onChanged=\{loadAll\} symbol=\{currencySymbol\} setActiveMenu=\{setActiveMenu\} setSalesShiftFilter=\{setSalesShiftFilter\} \/>/g,
  '<ShiftsTab organizationId={organizationId} locationId={activeLocationId} registers={registers} openShift={openShiftData} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} setActiveMenu={setActiveMenu} setSalesShiftFilter={setSalesShiftFilter} />'
);

content = content.replace(
  /<SalesReturnsTab organizationId=\{organizationId\} currentUserId=\{currentUserId\} onChanged=\{loadAll\} symbol=\{currencySymbol\} salesShiftFilter=\{salesShiftFilter\} setSalesShiftFilter=\{setSalesShiftFilter\} \/>/g,
  '<SalesReturnsTab organizationId={organizationId} locationId={activeLocationId} currentUserId={currentUserId} onChanged={loadAll} symbol={currencySymbol} salesShiftFilter={salesShiftFilter} setSalesShiftFilter={setSalesShiftFilter} />'
);

// 5. Update useEffect to reload when activeLocationId changes
content = content.replace(
  /useEffect\(\(\) => \{\n    loadAll\(\);\n    const notifTimer = setInterval\(loadNotifications, 15_000\);/g,
  `useEffect(() => {
    loadAll();
  }, [activeLocationId]);

  useEffect(() => {
    const notifTimer = setInterval(loadNotifications, 15_000);`
);

fs.writeFileSync('components/retail/ShopDashboard.tsx', content);
console.log('Patched ShopDashboard.tsx');
