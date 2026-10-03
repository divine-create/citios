const fs = require('fs');

let commerce = fs.readFileSync('app/actions/commerce.ts', 'utf8');

// Update getCityMartProducts to filter to parent products (parentId = null) and include variants
commerce = commerce.replace(
  /const products = allProducts\.filter\(\(p: any\) => orgIds\.includes\(p\.organizationId\) && \(cat === 'All' \|\| p\.globalCategory === cat\)\);/g,
  `const products = allProducts.filter((p: any) => orgIds.includes(p.organizationId) && (cat === 'All' || p.globalCategory === cat) && !p.parentId);`
);

// We need to fetch variants if needed, but for listing maybe not.
// Update getCityMartProduct to include variants
commerce = commerce.replace(
  /const p = await db\.orm\.public\.RetailProduct\.where\(\{ id: productId \}\)\.first\(\);/g,
  `const p = await db.orm.public.RetailProduct.where({ id: productId }).include({ variants: true }).first();`
);

fs.writeFileSync('app/actions/commerce.ts', commerce);

let retail = fs.readFileSync('lib/actions/retail.ts', 'utf8');
// Analytics action
const analyticsCode = `
export async function getShopAnalytics(organizationId: string) {
  try {
    await requireMembership(organizationId, ['OWNER', 'ADMIN', 'MANAGER']);
    const orders = await db.orm.public.RetailOrder.where({ organizationId }).all();
    const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED');
    const refundedOrders = orders.filter((o: any) => o.refundedAt != null);
    
    const grossSales = completedOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const refundsAmount = refundedOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const netSales = grossSales - refundsAmount;

    return {
      grossSales,
      netSales,
      refundsAmount,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      refundedOrders: refundedOrders.length,
    };
  } catch (error) {
    return { grossSales: 0, netSales: 0, refundsAmount: 0, totalOrders: 0, completedOrders: 0, refundedOrders: 0 };
  }
}
`;
if (!retail.includes('getShopAnalytics')) {
  retail += analyticsCode;
  fs.writeFileSync('lib/actions/retail.ts', retail);
}
