import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatReceiptPlainText,
  generateBarcodeBars,
  type PrintableReceiptData,
} from './receiptUtils';

describe('Thermal Receipt Utilities', () => {
  const sampleData: PrintableReceiptData = {
    orderId: 'ord-12345678-abcd',
    orderNumber: 'ORD-9876',
    storeName: 'Abeokuta Fresh Mart',
    storeAddress: '12 Ibara Road, Abeokuta, Ogun State',
    storePhone: '+234 801 234 5678',
    date: '2026-09-20T12:00:00.000Z',
    cashierName: 'Amina S.',
    orderType: 'STORE_SALE',
    items: [
      { name: 'Fresh Milk', quantity: 2, unitPrice: 1200, subtotal: 2400 },
      { name: 'Bread Loaf', quantity: 1, unitPrice: 800, subtotal: 800 },
    ],
    subtotal: 3200,
    taxAmount: 240,
    totalAmount: 3440,
    paymentMethod: 'CASH',
    amountTendered: 4000,
    changeDue: 560,
    currencySymbol: '₦',
    footerMessage: 'Thank you for shopping with us!',
  };

  it('formats receipt plain text for 80mm rolls with store and totals', () => {
    const text = formatReceiptPlainText(sampleData, 80);
    assert.ok(text.includes('ABEOKUTA FRESH MART'));
    assert.ok(text.includes('12 Ibara Road'));
    assert.ok(text.includes('ORD-9876'));
    assert.ok(text.includes('Fresh Milk'));
    assert.ok(text.includes('Bread Loaf'));
    assert.ok(text.includes('TOTAL DUE:'));
    assert.ok(text.includes('₦3440.00'));
    assert.ok(text.includes('Change:'));
    assert.ok(text.includes('₦560.00'));
  });

  it('formats receipt plain text for 58mm compact rolls without overflow', () => {
    const text = formatReceiptPlainText(sampleData, 58);
    const lines = text.split('\n');
    for (const line of lines) {
      assert.ok(line.length <= 40, `Line too long for 58mm roll: ${line}`);
    }
  });

  it('generates non-empty deterministic barcode bars', () => {
    const bars = generateBarcodeBars('ORD-9876');
    assert.ok(Array.isArray(bars));
    assert.ok(bars.length > 10);
    assert.ok(bars.every((b) => typeof b === 'number' && b > 0));
  });
});
