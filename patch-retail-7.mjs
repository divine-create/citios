import fs from 'fs';

let content = fs.readFileSync('lib/actions/retail.ts', 'utf8');

// Patch getShopDashboardData
const oldDash = /export async function getShopDashboardData\(organizationId: string, locationId\?: string \| null\) \{[\s\S]+?return JSON\.parse\(JSON\.stringify\(dashboard\)\);\s*\} catch \(error\) \{/g;

const newDash = `export async function getShopDashboardData(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    
    // Org-wide queries
    const settings = await db.orm.public.RetailSettings.where({ organizationId }).all().first();
    const products = await db.orm.public.RetailProduct.where({ organizationId }).all();
    
    // Location-scoped queries
    const whereScope = locationId ? { organizationId, locationId } : { organizationId };
    const orders = await db.orm.public.RetailOrder.where(whereScope).all();
    const openShift = await getOpenShift(organizationId, locationId);
    
    const today = startOfDay(new Date());
    const todayMs = today.getTime();
    
    const todayOrders = orders.filter((o) => epochMs(o.createdAt) >= todayMs);
    const completedToday = todayOrders.filter((o) => o.status === 'COMPLETED');
    
    const grossSales = completedToday.reduce((sum, o) => sum + o.totalAmount, 0);
    const netSales = orders.filter(o => o.status === 'COMPLETED').reduce((sum, o) => sum + o.totalAmount, 0);
    const transactions = completedToday.length;
    
    const allCustomers = await db.orm.public.CustomerData.where({ organizationId }).all();
    const newCustomersToday = allCustomers.filter((c) => epochMs(c.createdAt) >= todayMs).length;
    
    const recentOrders = [];
    for (const o of orders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt)).slice(0, 5)) {
      const cashier = await db.orm.public.Membership.where({ id: o.cashierId }).all().first();
      const person = cashier ? await db.orm.public.Person.where({ id: cashier.personId }).all().first() : null;
      const items = await db.orm.public.RetailOrderItem.where({ orderId: o.id }).all();
      recentOrders.push({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
        cashierName: person ? \`\${person.firstName} \${person.lastName}\`.trim() : 'Unknown',
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });
    }

    let lowStockProducts = [];
    if (locationId) {
      const locStocks = await db.orm.public.RetailLocationStock.where({ organizationId, locationId }).all();
      lowStockProducts = locStocks
        .filter(s => {
          const product = products.find(p => p.id === s.productId);
          return product && !product.isWeighed && product.lowStockLevel != null && s.stockQuantity <= product.lowStockLevel;
        })
        .map(s => {
          const product = products.find(p => p.id === s.productId)!;
          return {
            id: product.id,
            name: product.name,
            stockQuantity: s.stockQuantity,
            unit: product.unit,
            lowStockLevel: product.lowStockLevel,
          };
        });
    } else {
      lowStockProducts = products
        .filter(p => !p.isWeighed && p.lowStockLevel != null && p.stockQuantity <= p.lowStockLevel)
        .map(p => ({
          id: p.id,
          name: p.name,
          stockQuantity: p.stockQuantity,
          unit: p.unit,
          lowStockLevel: p.lowStockLevel,
        }));
    }

    const orderItems = await Promise.all(
      completedToday.map(o => db.orm.public.RetailOrderItem.where({ orderId: o.id }).all())
    ).then(res => res.flat());
    
    const productSales = new Map<string, { name: string; units: number; revenue: number }>();
    for (const item of orderItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;
      const current = productSales.get(product.id) || { name: product.name, units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += item.subtotal;
      productSales.set(product.id, current);
    }
    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const dashboard = {
      grossSales,
      transactions,
      newCustomersToday,
      netSales,
      totalOrders: orders.length,
      totalCompletedOrders: orders.filter(o => o.status === 'COMPLETED').length,
      totalProducts: products.length,
      recentOrders,
      lowStockProducts,
      topProducts,
      openShift,
      settings
    };
    
    return JSON.parse(JSON.stringify(dashboard));
  } catch (error) {`;

content = content.replace(oldDash, newDash);

// Patch getRegisters
const oldReg2 = /export async function getRegisters\(organizationId: string, locationId\?: string \| null\) \{[\s\S]+?return JSON\.parse\(JSON\.stringify\(registers\)\);\s*\} catch \(error\) \{/g;
const newReg2 = `export async function getRegisters(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    const whereScope = locationId ? { organizationId, locationId } : { organizationId };
    const registers = await db.orm.public.RetailRegister.where(whereScope).all();
    return JSON.parse(JSON.stringify(registers));
  } catch (error) {`;
content = content.replace(oldReg2, newReg2);

// Patch getOpenShift
const oldOpenShift2 = /export async function getOpenShift\(organizationId: string, locationId\?: string \| null\) \{[\s\S]+?return null;\s*\} catch \(error\) \{/g;
const newOpenShift2 = `export async function getOpenShift(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    const whereScope = locationId ? { organizationId, locationId } : { organizationId };
    const registers = await db.orm.public.RetailRegister.where(whereScope).all();
    for (const register of registers) {
      const shifts = await db.orm.public.RetailShift.where({ registerId: register.id, status: 'OPEN' }).all();
      if (shifts.length > 0) return JSON.parse(JSON.stringify({ ...shifts[0], registerName: register.name }));
    }
    return null;
  } catch (error) {`;
content = content.replace(oldOpenShift2, newOpenShift2);

// Patch getOrders
const oldOrders2 = /export async function getOrders\(organizationId: string, locationId\?: string \| null\) \{[\s\S]+?return JSON\.parse\(JSON\.stringify\(results\)\);\s*\} catch \(error\) \{/g;
const newOrders2 = `export async function getOrders(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    const whereScope = locationId ? { organizationId, locationId } : { organizationId };
    const orders = await db.orm.public.RetailOrder.where(whereScope).all();
    orders.sort((a, b) => epochMs(b.createdAt) - epochMs(a.createdAt));
    
    const results = [];
    for (const o of orders) {
      const cashier = await db.orm.public.Membership.where({ id: o.cashierId }).all().first();
      const person = cashier ? await db.orm.public.Person.where({ id: cashier.personId }).all().first() : null;
      const shift = o.shiftId ? await db.orm.public.RetailShift.where({ id: o.shiftId }).all().first() : null;
      const register = shift ? await db.orm.public.RetailRegister.where({ id: shift.registerId }).all().first() : null;
      results.push({
        ...o,
        cashierName: person ? \`\${person.firstName} \${person.lastName}\`.trim() : 'Unknown',
        registerName: register ? register.name : null,
      });
    }
    return JSON.parse(JSON.stringify(results));
  } catch (error) {`;
content = content.replace(oldOrders2, newOrders2);

// Patch getShiftHistory
const oldShift2 = /export async function getShiftHistory\(organizationId: string, locationId\?: string \| null\) \{[\s\S]+?return JSON\.parse\(JSON\.stringify\(shifts\)\);\s*\} catch \(error\) \{/g;
const newShift2 = `export async function getShiftHistory(organizationId: string, locationId?: string | null) {
  try {
    await requireMembership(organizationId);
    const whereScope = locationId ? { organizationId, locationId } : { organizationId };
    const shifts = await db.orm.public.RetailShift.where(whereScope).all();
    shifts.sort((a, b) => epochMs(b.openedAt) - epochMs(a.openedAt));
    return JSON.parse(JSON.stringify(shifts));
  } catch (error) {`;
content = content.replace(oldShift2, newShift2);

fs.writeFileSync('lib/actions/retail.ts', content);
console.log('Patched queries with whereScope');
