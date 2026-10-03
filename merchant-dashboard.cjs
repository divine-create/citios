const fs = require('fs');

let dash = fs.readFileSync('components/retail/ShopDashboard.tsx', 'utf8');

if (!dash.includes('getShopAnalytics')) {
  dash = dash.replace(
    /import \{ getStoreStats, [\s\S]*? \} from "@\/app\/actions\/commerce";/,
    `$&
import { getShopAnalytics } from "@/lib/actions/retail";`
  );
}

if (!dash.includes('const [analytics, setAnalytics] = useState<any>(null);')) {
  dash = dash.replace(
    /const \[dashboard, setDashboard\] = useState<any>\(\{/,
    `const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [dashboard, setDashboard] = useState<any>({`
  );
}

// Analytics fetch
if (!dash.includes('setAnalytics(data)')) {
  dash = dash.replace(
    /useEffect\(\(\) => \{\r?\n\s*if \(!activeLocationId\) return;\r?\n\s*let mounted = true;/,
    `$&
    
    if (activeMenu === "Analytics") {
      setLoadingAnalytics(true);
      getShopAnalytics(organizationId).then(data => {
        if (mounted) {
          setAnalytics(data);
          setLoadingAnalytics(false);
        }
      });
    }
    `
  );
}

// Add the tab trigger for Analytics if missing
if (!dash.includes('value="Analytics"')) {
  dash = dash.replace(
    /<TabsTrigger value="Dashboard">Dashboard<\/TabsTrigger>/,
    `<TabsTrigger value="Dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="Analytics">Analytics</TabsTrigger>`
  );
}

// Add the Analytics Tab Content
const analyticsTab = `
        <TabsContent value="Analytics" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Orders" value={analytics?.totalOrders || 0} icon={ShoppingCart} tone="brand" />
            <StatCard label="Completed Orders" value={analytics?.completedOrders || 0} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Refunded Orders" value={analytics?.refundedOrders || 0} icon={CreditCard} tone="amber" />
            <StatCard label="Gross Sales" value={money(analytics?.grossSales || 0)} icon={DollarSign} tone="brand" />
            <StatCard label="Refunds Amount" value={money(analytics?.refundsAmount || 0)} icon={TrendingDown} tone="amber" />
            <StatCard label="Net Sales" value={money(analytics?.netSales || 0)} icon={TrendingUp} tone="emerald" />
          </div>
        </TabsContent>
`;
if (!dash.includes('value="Analytics" className="mt-6 space-y-6"')) {
  dash = dash.replace(
    /<TabsContent value="Dashboard" className="mt-6 space-y-6">/,
    `${analyticsTab}\n        <TabsContent value="Dashboard" className="mt-6 space-y-6">`
  );
}

// Now handle refunds and cancel in orders.
// Import cancelOrder and refundOrder
if (!dash.includes('cancelOrder')) {
  dash = dash.replace(
    /import \{ getShopAnalytics \} from "@\/lib\/actions\/retail";/,
    `import { getShopAnalytics, cancelOrder, refundOrder } from "@/lib/actions/retail";`
  );
}

// Add state for order actions
if (!dash.includes('orderActionLoading')) {
  dash = dash.replace(
    /const \[salesShiftFilter, setSalesShiftFilter\] = useState<string \| null>\(null\);/,
    `const [salesShiftFilter, setSalesShiftFilter] = useState<string | null>(null);
  const [orderActionLoading, setOrderActionLoading] = useState<string | null>(null);
  
  const handleCancelOrder = async (id: string) => {
    setOrderActionLoading(id);
    await cancelOrder(id);
    setOrderActionLoading(null);
    setOrders(orders.map(o => o.id === id ? { ...o, status: 'CANCELLED' } : o));
  };
  
  const handleRefundOrder = async (id: string) => {
    setOrderActionLoading(id);
    await refundOrder(id, 'Merchant requested');
    setOrderActionLoading(null);
    setOrders(orders.map(o => o.id === id ? { ...o, refundedAt: new Date().toISOString() } : o));
  };`
  );
}

// Inject buttons in order details
const orderBtns = `
                        {order.status === 'PENDING' && (
                          <button onClick={() => handleCancelOrder(order.id)} disabled={orderActionLoading === order.id} className="w-full text-center py-2 text-red-600 font-bold border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                            {orderActionLoading === order.id ? 'Canceling...' : 'Cancel Order'}
                          </button>
                        )}
                        {(order.status === 'COMPLETED' || order.status === 'PAID') && !order.refundedAt && (
                          <button onClick={() => handleRefundOrder(order.id)} disabled={orderActionLoading === order.id} className="w-full text-center py-2 text-amber-600 font-bold border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50">
                            {orderActionLoading === order.id ? 'Refunding...' : 'Process Refund'}
                          </button>
                        )}
                        {order.refundedAt && (
                          <div className="w-full text-center py-2 text-slate-500 font-bold border border-slate-200 rounded-lg bg-slate-50">
                            Refunded
                          </div>
                        )}
`;

dash = dash.replace(
  /<button\s*className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"\s*>\s*Print Receipt\s*<\/button>/,
  `$&
${orderBtns}`
);

fs.writeFileSync('components/retail/ShopDashboard.tsx', dash);
