// Presentation helpers shared by production UI. Currency formatting is
// per-city: the active City's `currency` drives symbol + locale via
// `formatMoney`; the `useMoney()` hook (CityProvider) wires it into client
// components, server components call it directly with getCurrentCity().

const CURRENCY_STYLE: Record<string, { symbol: string; locale: string }> = {
  NGN: { symbol: '₦', locale: 'en-NG' },
  USD: { symbol: '$', locale: 'en-US' },
  GHS: { symbol: '₵', locale: 'en-GH' },
  KES: { symbol: 'KSh', locale: 'en-KE' },
  ZAR: { symbol: 'R', locale: 'en-ZA' },
  GBP: { symbol: '£', locale: 'en-GB' },
  EUR: { symbol: '€', locale: 'de-DE' },
};

export function currencySymbol(currency: string): string {
  return CURRENCY_STYLE[currency]?.symbol ?? `${currency} `;
}

export function formatMoney(amount: number, currency = 'NGN'): string {
  const style = CURRENCY_STYLE[currency] ?? { symbol: `${currency} `, locale: 'en' };
  return style.symbol + Math.round(amount).toLocaleString(style.locale);
}

/** NGN shorthand kept for demo/org surfaces that own their own currency. */
export function fmtNaira(amount: number): string {
  return formatMoney(amount, 'NGN');
}

export function parseNaira(s: string | number): number {
  return typeof s === 'number' ? s : Number(String(s).replace(/[₦$£€₵,\s]/g, '')) || 0;
}

