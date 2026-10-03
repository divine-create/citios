const fs = require('fs');
let content = fs.readFileSync('components/cityos/ResidentOrders.tsx', 'utf8');

// Import cancelOrder and refundOrder
if (!content.includes('cancelOrder')) {
  content = content.replace(
    /import \{ fetchMyOrders \} from '@\/app\/actions\/orders';/,
    `import { fetchMyOrders } from '@/app/actions/orders';\nimport { cancelOrder, refundOrder } from '@/lib/actions/retail';`
  );
}

// Add state for loading buttons
if (!content.includes('actionLoading')) {
  content = content.replace(
    /const \[receiptOrder, setReceiptOrder\] = useState<any>\(null\);/,
    `const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);`
  );
}

// Add action handlers
if (!content.includes('handleCancel')) {
  content = content.replace(
    /const { fmt } = useMoney\(\);/,
    `const { fmt } = useMoney();
  
  const handleCancel = async (id: string) => {
    setActionLoading(id);
    await cancelOrder(id);
    const res = await fetchMyOrders();
    setData(res);
    setActionLoading(null);
  };
  
  const handleRefund = async (id: string) => {
    setActionLoading(id);
    await refundOrder(id, 'User requested');
    const res = await fetchMyOrders();
    setData(res);
    setActionLoading(null);
  };`
  );
}

// Inject buttons and tracking into the card
const buttonInject = `
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-500">
                    {order.payment?.method === 'WALLET' ? 'Paid via Wallet' : order.payment ? 'Paid' : 'Payment Pending'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReceiptOrder(order)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-teal-800 bg-slate-100 hover:bg-teal-50 px-2.5 py-1 rounded-lg transition-colors border border-slate-200"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Receipt</span>
                  </button>
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={actionLoading === order.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                    >
                      {actionLoading === order.id ? 'Canceling...' : 'Cancel'}
                    </button>
                  )}
                  {order.status === 'COMPLETED' && !order.refundedAt && (
                    <button
                      onClick={() => handleRefund(order.id)}
                      disabled={actionLoading === order.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors border border-amber-200 disabled:opacity-50"
                    >
                      {actionLoading === order.id ? 'Refunding...' : 'Request Refund'}
                    </button>
                  )}
                </div>
`;
content = content.replace(
  /<div className="pt-4 border-t border-slate-100 flex justify-between items-center">\s*<div className="flex items-center gap-2\.5">\s*<span className="text-xs font-bold text-slate-500">\s*\{order\.payment\?\.method === 'WALLET' \? 'Paid via Wallet' : order\.payment \? 'Paid' : 'Payment Pending'\}\s*<\/span>\s*<button\s*type="button"\s*onClick=\{\(\) => setReceiptOrder\(order\)\}\s*className="inline-flex items-center gap-1 text-\[11px\] font-bold text-slate-700 hover:text-teal-800 bg-slate-100 hover:bg-teal-50 px-2\.5 py-1 rounded-lg transition-colors border border-slate-200"\s*>\s*<Printer className="w-3 h-3" \/>\s*<span>Receipt<\/span>\s*<\/button>\s*<\/div>/,
  buttonInject
);

// Inject fulfillment status
content = content.replace(
  /\{order\.delivery && \(/,
  `{order.category === 'MARKET' && order.fulfillmentStatus && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Package className="w-4 h-4" />
                    <div className="flex-1">
                      <span>Fulfillment: {order.fulfillmentStatus}</span>
                    </div>
                  </div>
                </div>
              )}
              {order.delivery && (`
);

fs.writeFileSync('components/cityos/ResidentOrders.tsx', content);
