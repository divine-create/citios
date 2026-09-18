// Neutral formatting utilities shared by production UI. These were
// previously locked inside lib/demo/cityos; they are presentation helpers
// only and carry no demo data.

export function fmtNaira(amount: number): string {
  return '₦' + Math.round(amount).toLocaleString('en-NG');
}

export function parseNaira(s: string | number): number {
  return typeof s === 'number' ? s : Number(String(s).replace(/[₦,\s]/g, '')) || 0;
}

// NOTE: display currency is still naira across the prototype. Per-city
// currency lives on the City record (City.currency) and can replace this
// helper once real multi-currency prices are seeded.
