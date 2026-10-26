export const rand = (cents: number) => `R${(cents / 100).toFixed(2)}`;

export function ago(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
