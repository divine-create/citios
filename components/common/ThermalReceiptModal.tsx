'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Share2,
  Smartphone,
  Layers,
  FileText,
} from 'lucide-react';
import { getReceiptData } from '@/lib/actions/retail';
import {
  PrintableReceiptData,
  formatReceiptPlainText,
  generateBarcodeBars,
} from '@/lib/receiptUtils';

interface ThermalReceiptModalProps {
  orderId?: string;
  initialData?: PrintableReceiptData;
  onClose: () => void;
}

export default function ThermalReceiptModal({
  orderId,
  initialData,
  onClose,
}: ThermalReceiptModalProps) {
  const [data, setData] = useState<PrintableReceiptData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData && Boolean(orderId));
  const [rollWidth, setRollWidth] = useState<80 | 58>(80);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    if (!orderId) return;

    let active = true;
    async function fetchReceipt() {
      try {
        const raw = await getReceiptData(orderId!);
        if (!active || !raw) return;

        const { order, items, cashier, settings } = raw;
        const subtotal = order.totalAmount - (order.taxAmount || 0) + (order.discountAmount || 0);

        setData({
          orderId: order.id,
          orderNumber: order.id.slice(-8).toUpperCase(),
          storeName: settings?.storeName || 'CityConnect Store',
          storeAddress: settings?.storeAddress || '',
          storePhone: (settings as any)?.storePhone || '',
          date: order.createdAt,
          cashierName: cashier || 'Store Cashier',
          orderType: 'STORE_SALE',
          items: items.map((i: any) => ({
            name: i.product?.name || i.productName || 'Item',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
          subtotal,
          discountAmount: order.discountAmount || 0,
          taxAmount: order.taxAmount || 0,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod || 'CASH',
          currencySymbol: settings?.currencySymbol || '$',
          footerMessage: settings?.receiptMessage || 'Thank you for your patronage!',
        });
      } catch (err) {
        console.error('Failed to load receipt:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchReceipt();
    return () => {
      active = false;
    };
  }, [orderId, initialData]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!data) return;
    const text = formatReceiptPlainText(data, rollWidth);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    const text = formatReceiptPlainText(data, rollWidth);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <Loader2 className="animate-spin text-brand-600 mb-4" size={36} />
          <p className="text-slate-700 font-bold">Generating Thermal Receipt...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sym = data.currencySymbol || '$';
  const barcodeBars = generateBarcodeBars(data.orderNumber || data.orderId);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container Dialog */}
      <div className="bg-slate-100 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-200/80 my-auto print:bg-white print:border-none print:shadow-none print:m-0 print:max-h-none print:w-auto">
        
        {/* Modal Header Controls (Hidden during print) */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base leading-tight">Order Receipt</h3>
              <p className="text-[11px] font-semibold text-slate-400">Thermal POS & Digital Copy</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Roll width toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setRollWidth(80)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  rollWidth === 80
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setRollWidth(58)}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  rollWidth === 58
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center bg-slate-200/60 print:p-0 print:bg-white">
          {/* Thermal Receipt Paper Roll Simulation */}
          <div
            ref={receiptRef}
            id="thermal-receipt-paper"
            style={{
              width: rollWidth === 58 ? '240px' : '320px',
              maxWidth: '100%',
            }}
            className="bg-white text-slate-950 font-mono text-[12px] p-5 shadow-lg rounded-sm border-t-4 border-slate-900 flex flex-col transition-all print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* Business Header */}
            <div className="text-center space-y-1 mb-4 border-b border-dashed border-slate-300 pb-3">
              <h2 className="text-base font-black tracking-wide uppercase">{data.storeName}</h2>
              {data.storeAddress && (
                <p className="text-[11px] text-slate-600 leading-snug whitespace-pre-wrap">
                  {data.storeAddress}
                </p>
              )}
              {data.storePhone && (
                <p className="text-[11px] text-slate-600">Tel: {data.storePhone}</p>
              )}
            </div>

            {/* Receipt Metadata */}
            <div className="space-y-1 text-[11px] text-slate-600 border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(data.date).toLocaleString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold text-slate-950">
                  #{data.orderNumber || data.orderId.slice(-8).toUpperCase()}
                </span>
              </div>
              {data.cashierName && (
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{data.cashierName}</span>
                </div>
              )}
              {data.tableName && (
                <div className="flex justify-between">
                  <span>Table:</span>
                  <span className="font-bold text-slate-900">{data.tableName}</span>
                </div>
              )}
              {data.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold">{data.customerName}</span>
                </div>
              )}
              {data.orderType && (
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="uppercase font-semibold">{data.orderType.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="mb-4">
              <div className="flex justify-between font-bold text-[11px] border-b border-slate-900 pb-1 mb-2">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>

              <div className="space-y-2">
                {data.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 flex-1 pr-2">
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-900 shrink-0">
                        {sym}{item.subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>
                        {item.quantity} × {sym}{item.unitPrice.toFixed(2)}
                      </span>
                      {item.notes && <span className="italic text-slate-600">({item.notes})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-1.5 text-[11px] mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{sym}{data.subtotal.toFixed(2)}</span>
              </div>
              {data.discountAmount && data.discountAmount > 0 ? (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span>-{sym}{data.discountAmount.toFixed(2)}</span>
                </div>
              ) : null}
              {data.taxAmount && data.taxAmount > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Tax / VAT:</span>
                  <span>{sym}{data.taxAmount.toFixed(2)}</span>
                </div>
              ) : null}
              {data.deliveryFee && data.deliveryFee > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery:</span>
                  <span>{sym}{data.deliveryFee.toFixed(2)}</span>
                </div>
              ) : null}
              {data.serviceCharge && data.serviceCharge > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Service:</span>
                  <span>{sym}{data.serviceCharge.toFixed(2)}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t-2 border-slate-900 mt-1">
                <span>TOTAL DUE:</span>
                <span>{sym}{data.totalAmount.toFixed(2)}</span>
              </div>

              {data.paymentMethod && (
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 pt-1">
                  <span>Payment Method:</span>
                  <span className="uppercase">{data.paymentMethod}</span>
                </div>
              )}
            </div>

            {/* Barcode & Verification Footer */}
            <div className="text-center pt-2 border-t border-dashed border-slate-300 space-y-2">
              {/* Simulated 1D Barcode */}
              <div className="flex justify-center items-center gap-[2px] h-9 my-1">
                {barcodeBars.map((w, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 h-full"
                    style={{ width: `${w}px` }}
                  />
                ))}
              </div>
              <p className="font-mono text-[9px] text-slate-500 tracking-widest">
                *{data.orderNumber || data.orderId.slice(-8).toUpperCase()}*
              </p>

              <p className="text-[11px] font-medium text-slate-700 italic pt-1">
                {data.footerMessage || 'Thank you for your patronage!'}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                CityConnect Hyperlocal Platform
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Bar (Hidden during print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 min-w-[120px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            title="Share text receipt via WhatsApp"
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            title="Copy plain-text receipt"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Global Thermal Print CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-paper,
          #thermal-receipt-paper * {
            visibility: visible;
          }
          #thermal-receipt-paper {
            position: fixed;
            left: 0;
            top: 0;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            width: ${rollWidth === 58 ? '54mm' : '76mm'} !important;
            max-width: 100% !important;
            color: #000000 !important;
            background: #ffffff !important;
          }
          @page {
            size: ${rollWidth === 58 ? '58mm' : '80mm'} auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
