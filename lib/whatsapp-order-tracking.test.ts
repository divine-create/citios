import test from 'node:test';
import assert from 'node:assert/strict';

export function isWhatsAppOrder(order: {
  paymentMethod?: string;
  payment?: { method?: string; provider?: string };
  type?: string;
}) {
  return (
    order.paymentMethod === 'WHATSAPP' ||
    order.payment?.method === 'WHATSAPP' ||
    order.payment?.provider === 'WHATSAPP' ||
    order.type === 'WHATSAPP_DIRECT'
  );
}

export function formatWhatsAppChatLink(phone: string | null | undefined, orgName: string, orderId: string) {
  if (!phone) return null;
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.substring(1);
  if (clean.startsWith('0')) clean = '234' + clean.substring(1);
  if (!clean.startsWith('234') && clean.length === 10) clean = '234' + clean;
  const text = encodeURIComponent(`Hello ${orgName || 'there'}, I am checking in regarding my order #${orderId.slice(0, 8).toUpperCase()}.`);
  return `https://wa.me/${clean}?text=${text}`;
}

test('WhatsApp Order Tracking & Suppression Contract Suite', async (t) => {
  await t.test('1. Accurately identifies WhatsApp orders from paymentMethod or payment metadata', () => {
    const waOrder1 = { paymentMethod: 'WHATSAPP' };
    const waOrder2 = { paymentMethod: 'CARD', payment: { method: 'WHATSAPP' } };
    const waOrder3 = { paymentMethod: 'TRANSFER', payment: { provider: 'WHATSAPP' } };
    const waOrder4 = { type: 'WHATSAPP_DIRECT' };

    assert.equal(isWhatsAppOrder(waOrder1), true, 'Order 1 should be identified as WhatsApp order');
    assert.equal(isWhatsAppOrder(waOrder2), true, 'Order 2 should be identified as WhatsApp order');
    assert.equal(isWhatsAppOrder(waOrder3), true, 'Order 3 should be identified as WhatsApp order');
    assert.equal(isWhatsAppOrder(waOrder4), true, 'Order 4 should be identified as WhatsApp order');
  });

  await t.test('2. Accurately retains standard live tracking for Wallet and Card orders', () => {
    const walletOrder = { paymentMethod: 'WALLET', payment: { method: 'WALLET', provider: 'INTERNAL_WALLET' } };
    const cardOrder = { paymentMethod: 'CARD', payment: { method: 'CARD', provider: 'MONNIFY' } };

    assert.equal(isWhatsAppOrder(walletOrder), false, 'Wallet order must not be marked as WhatsApp order');
    assert.equal(isWhatsAppOrder(cardOrder), false, 'Card order must not be marked as WhatsApp order');
  });

  await t.test('3. Formats WhatsApp merchant chat deep links reliably with Nigerian international code', () => {
    const link1 = formatWhatsAppChatLink('08023456789', 'Calabar Kitchen', 'ord_123456789');
    assert.ok(link1?.includes('https://wa.me/2348023456789'), 'Should sanitize 080... to 23480...');
    assert.ok(link1?.includes('ORD_1234'), 'Should include capitalized short order ID');

    const link2 = formatWhatsAppChatLink('+2349012345678', 'Suya Spot', 'ord_abcdefgh');
    assert.ok(link2?.includes('https://wa.me/2349012345678'), 'Should strip + and retain 234');

    const linkNull = formatWhatsAppChatLink(null, 'No Phone Store', 'ord_999');
    assert.equal(linkNull, null, 'Should return null gracefully when phone is null');
  });
});
