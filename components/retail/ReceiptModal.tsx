import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2, Loader2 } from 'lucide-react';
import { getReceiptData } from '../../lib/actions/retail';

interface ReceiptModalProps {
  orderId: string;
  onClose: () => void;
}

export default function ReceiptModal({ orderId, onClose }: ReceiptModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReceipt() {
      const receipt = await getReceiptData(orderId);
      setData(receipt);
      setLoading(false);
    }
    fetchReceipt();
  }, [orderId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
          <p className="text-slate-600 font-medium">Generating Receipt...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { order, items, cashier, settings } = data;
  const storeName = settings?.storeName || 'CityConnect Retail';
  const currency = settings?.currencySymbol || '$';
  const address = settings?.storeAddress || '';
  const message = settings?.receiptMessage || 'Thank you for your purchase!';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Success Banner */}
        <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center justify-center gap-2 print:hidden">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <span className="font-bold text-emerald-700">Payment Successful</span>
        </div>

        {/* Receipt Content (Printable area) */}
        <div className="p-6 overflow-y-auto font-mono text-sm print:p-0 print:overflow-visible">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest">{storeName}</h2>
            {address && <p className="text-slate-500 mt-1 whitespace-pre-wrap text-xs">{address}</p>}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 mb-4 border-b border-dashed border-slate-300 pb-2">
            <span>{new Date(order.createdAt).toLocaleString()}</span>
            <span>Ref: {order.id.slice(-6).toUpperCase()}</span>
          </div>

          <div className="text-xs text-slate-500 mb-4">
            <p>Cashier: {cashier}</p>
            <p>Payment: {order.paymentMethod}</p>
          </div>

          {/* Line Items */}
          <div className="space-y-3 mb-6">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800">{item.product?.name || 'Unknown Item'}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} x {currency}{item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <span className="font-bold text-slate-800">{currency}{item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-slate-300 pt-3 space-y-2 mb-8">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{currency}{(order.totalAmount - order.taxAmount + order.discountAmount).toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{currency}{order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>{currency}{order.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-slate-800 pt-2 border-t border-slate-200 mt-2">
              <span>TOTAL</span>
              <span>{currency}{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-slate-500 space-y-2">
            <p className="italic">{message}</p>
            <p>Powered by CityConnect ShopOS</p>
          </div>

        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Printer size={18} />
            Print
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
          >
            <CheckCircle2 size={18} />
            Done
          </button>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          .font-mono { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; padding: 20px; font-family: monospace; }
          .font-mono * { visibility: visible; }
        }
      `}} />
    </div>
  );
}
