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
  date?: string | Date | number | any;
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
 * Safely parse any date representation (Date, ISO string, epoch ms, epoch seconds, Temporal Instant).
 * Guaranteed to never throw and never return an Invalid Date (falls back to current time).
 */
export function parseReceiptDate(input: any): Date {
  if (!input) return new Date();

  // If already a valid Date object
  if (input instanceof Date && !isNaN(input.getTime())) {
    return input;
  }

  // If object with epochMilliseconds, getTime, or seconds
  if (typeof input === 'object') {
    if (typeof input.epochMilliseconds === 'number' && !isNaN(input.epochMilliseconds)) {
      const d = new Date(input.epochMilliseconds);
      if (!isNaN(d.getTime())) return d;
    }
    if (typeof input.getTime === 'function') {
      try {
        const d = new Date(input.getTime());
        if (!isNaN(d.getTime())) return d;
      } catch {
        // ignore
      }
    }
    if (typeof input.seconds === 'number' && !isNaN(input.seconds)) {
      const d = new Date(input.seconds * 1000);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // If numeric timestamp
  if (typeof input === 'number' && !isNaN(input)) {
    const ms = input < 10000000000 ? input * 1000 : input;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }

  // If string
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return new Date();

    // Check if numeric string timestamp
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

/**
 * Format receipt date safely into a localized human-readable string.
 * Guaranteed never to return "Invalid Date".
 */
export function formatReceiptDate(input: any, options?: Intl.DateTimeFormatOptions): string {
  const d = parseReceiptDate(input);
  try {
    return d.toLocaleString([], options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toISOString();
  }
}

/**
 * Format plain-text receipt for WhatsApp sharing or raw serial/ESC-POS printers
 */
export function formatReceiptPlainText(data: PrintableReceiptData, rollWidth: 80 | 58 = 80): string {
  const width = rollWidth === 58 ? 32 : 42;
  const sym = data.currencySymbol || '₦';
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

  const formattedDate = formatReceiptDate(data.date, {
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
  lines.push(center('Powered by 9jaLive'));
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
