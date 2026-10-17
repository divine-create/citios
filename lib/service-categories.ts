export function matchServiceCategory(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('solar') || t.includes('inverter') || t.includes('cctv') || t.includes('network') || t.includes('software') || t.includes('laptop') || t.includes('computer') || t.includes('battery') || t.includes('lithium') || t.includes('bms')) {
    return 'Tech & Solar';
  }
  if (/\b(car|cars|auto|automotive|mechanic|engine|tire|tires|tyre|tyres|generator|vehicle|vehicles|brake|brakes)\b/.test(t)) {
    return 'Automotive & Power';
  }
  if (t.includes('ac ') || t.includes('air condition') || t.includes('hvac') || t.includes('plumb') || t.includes('electri') || t.includes('wire') || t.includes('weld') || t.includes('carpenter') || t.includes('carpentry') || t.includes('paint') || t.includes('fix') || t.includes('roof') || t.includes('borehole') || t.includes('switch') || t.includes('meter') || t.includes('breaker') || t.includes('circuit')) {
    return 'Trades & Repair';
  }
  if (t.includes('clean') || t.includes('laundry') || t.includes('wash') || t.includes('maid') || t.includes('housekeep') || t.includes('fumigat')) {
    return 'Home & Cleaning';
  }
  if (t.includes('hair') || t.includes('barber') || t.includes('salon') || t.includes('spa') || t.includes('nail') || t.includes('massage') || t.includes('beauty') || t.includes('braid') || t.includes('scrub') || t.includes('exfoliat') || t.includes('facial') || t.includes('groom')) {
    return 'Beauty & Wellness';
  }
  if (t.includes('doctor') || t.includes('nurse') || t.includes('health') || t.includes('clinic') || t.includes('therapy') || t.includes('dental') || t.includes('teeth') || t.includes('physio') || t.includes('patient') || t.includes('care') || t.includes('medical') || t.includes('phlebotomy') || t.includes('ultrasound') || t.includes('diagnos') || t.includes('blood') || t.includes('wellness') || t.includes('panel')) {
    return 'Health & Care';
  }
  return null;
}

export function inferServiceCategory(name: string, description?: string | null): string {
  // First match against name/title
  const fromName = matchServiceCategory(name);
  if (fromName) return fromName;

  // Fallback match against combined text
  const fromFull = matchServiceCategory(`${name} ${description || ''}`);
  if (fromFull) return fromFull;

  return 'General Services';
}
