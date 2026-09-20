type WhatsAppOrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (phone.trim().startsWith('+')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
}

export async function sendWhatsAppOrderNotification(input: {
  phone?: string | null;
  orderId: string;
  storeName?: string | null;
  items: WhatsAppOrderItem[];
  totalAmount: number;
  currencySymbol?: string | null;
}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId || !input.phone) return { sent: false as const, reason: 'not_configured' as const };

  const recipient = normalizeWhatsAppPhone(input.phone);
  if (!recipient) return { sent: false as const, reason: 'invalid_phone' as const };

  const symbol = input.currencySymbol ?? '$';
  const lines = input.items.map((item) => `${item.quantity} x ${item.name} - ${symbol}${item.unitPrice.toFixed(2)}`);
  const body = [
    `Order confirmed${input.storeName ? ` at ${input.storeName}` : ''}.`,
    `Order #${input.orderId.slice(0, 8).toUpperCase()}`,
    ...lines,
    `Total: ${symbol}${input.totalAmount.toFixed(2)}`,
    'Thank you for shopping with us.',
  ].join('\n');

  const version = process.env.WHATSAPP_API_VERSION ?? 'v20.0';
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => 'Unknown WhatsApp API error');
    throw new Error(`WhatsApp API request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return { sent: true as const };
}
