/**
 * Thermal Receipt Utilities
 * Formatter for ASCII/plain text (WhatsApp/SMS/ESC-POS) and SVG Barcode / QR patterns.
 */

export interface PrintableReceiptData {
  orderId: string;
  orderNumber?: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  date: string | Date;
  cashierName?: string;
  orderType?: 'STORE_SALE' | 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes?: string;
  }>;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  deliveryFee?: number;
  serviceCharge?: number;
  totalAmount: number;
  paymentMethod?: string;
  amountTendered?: number;
  changeDue?: number;
  currencySymbol?: string;
  footerMessage?: string;
  receiptUrl?: string;
}

/**
 * Format plain-text receipt for WhatsApp sharing or raw serial/ESC-POS printers
 */
export function formatReceiptPlainText(data: PrintableReceiptData, rollWidth: 80 | 58 = 80): string {
  const width = rollWidth === 58 ? 32 : 42;
  const sym = data.currencySymbol || '$';
  const sep = '='.repeat(width);
  const dash = '-'.repeat(width);

  const center = (str: string) => {
    const s = str.trim().slice(0, width);
    const pad = Math.max(0, Math.floor((width - s.length) / 2));
    return ' '.repeat(pad) + s;
  };

  const row = (left: string, right: string) => {
    const r = right.trim();
    const maxL = Math.max(0, width - r.length - 1);
    const l = left.trim().slice(0, maxL);
    const spaces = Math.max(1, width - l.length - r.length);
    return l + ' '.repeat(spaces) + r;
  };

  const lines: string[] = [];

  lines.push(sep);
  lines.push(center(data.storeName.toUpperCase()));
  if (data.storeAddress) {
    lines.push(center(data.storeAddress));
  }
  if (data.storePhone) {
    lines.push(center(`Tel: ${data.storePhone}`));
  }
  lines.push(dash);

  const formattedDate = new Date(data.date).toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  lines.push(row('Date:', formattedDate));
  lines.push(row('Order #:', data.orderNumber || data.orderId.slice(-8).toUpperCase()));
  if (data.cashierName) {
    lines.push(row('Staff:', data.cashierName));
  }
  if (data.tableName) {
    lines.push(row('Table:', data.tableName));
  }
  if (data.customerName) {
    lines.push(row('Customer:', data.customerName));
  }
  if (data.orderType) {
    lines.push(row('Type:', data.orderType.replace('_', ' ')));
  }

  lines.push(dash);
  lines.push(row('QTY ITEM', 'TOTAL'));
  lines.push(dash);

  for (const item of data.items) {
    const itemTotal = `${sym}${item.subtotal.toFixed(2)}`;
    const itemHeader = `${item.quantity}x ${item.name}`;
    lines.push(row(itemHeader, itemTotal));
    if (item.quantity > 1) {
      lines.push(`   @ ${sym}${item.unitPrice.toFixed(2)} each`);
    }
    if (item.notes) {
      lines.push(`   * ${item.notes}`);
    }
  }

  lines.push(dash);
  lines.push(row('Subtotal:', `${sym}${data.subtotal.toFixed(2)}`));
  if (data.discountAmount && data.discountAmount > 0) {
    lines.push(row('Discount:', `-${sym}${data.discountAmount.toFixed(2)}`));
  }
  if (data.taxAmount && data.taxAmount > 0) {
    lines.push(row('Tax / VAT:', `${sym}${data.taxAmount.toFixed(2)}`));
  }
  if (data.deliveryFee && data.deliveryFee > 0) {
    lines.push(row('Delivery:', `${sym}${data.deliveryFee.toFixed(2)}`));
  }
  if (data.serviceCharge && data.serviceCharge > 0) {
    lines.push(row('Service:', `${sym}${data.serviceCharge.toFixed(2)}`));
  }
  lines.push(dash);
  lines.push(row('TOTAL DUE:', `${sym}${data.totalAmount.toFixed(2)}`));

  if (data.paymentMethod) {
    lines.push(row('Payment:', data.paymentMethod));
  }
  if (data.amountTendered != null && data.amountTendered > 0) {
    lines.push(row('Tendered:', `${sym}${data.amountTendered.toFixed(2)}`));
  }
  if (data.changeDue != null && data.changeDue >= 0) {
    lines.push(row('Change:', `${sym}${data.changeDue.toFixed(2)}`));
  }

  lines.push(sep);
  lines.push(center(data.footerMessage || 'Thank you for your patronage!'));
  lines.push(center('Powered by CityConnect'));
  if (data.receiptUrl) {
    lines.push(center(data.receiptUrl));
  }
  lines.push(sep);

  return lines.join('\n');
}

/**
 * Generate clean SVG Barcode bars
 */
export function generateBarcodeBars(text: string): number[] {
  // Deterministic bar widths pattern based on char codes
  const widths: number[] = [2, 1, 1, 2, 1, 2];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    widths.push((code % 3) + 1);
    widths.push(((code >> 2) % 2) + 1);
    widths.push(((code >> 4) % 3) + 1);
    widths.push(1);
  }
  widths.push(2, 1, 2, 1, 1, 2);
  return widths;
}
