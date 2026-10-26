/** South African numbers to +27 form. Returns null if it does not look like a valid number. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[^\d+]/g, "");
  if (/^\+27\d{9}$/.test(d)) return d;
  if (/^27\d{9}$/.test(d)) return "+" + d;
  if (/^0\d{9}$/.test(d)) return "+27" + d.slice(1);
  return null;
}

export const showPhone = (p: string) =>
  p.startsWith("+27") && p.length === 12 ? `0${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8)}` : p;

export const last4 = (p: string) => p.replace(/\D/g, "").slice(-4);
