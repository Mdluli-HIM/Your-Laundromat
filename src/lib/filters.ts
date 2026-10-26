import { addDays, dkey, parseKey, startOfDay } from "@/lib/reports";

export const PRESETS = [
  ["all", "All time"],
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["month", "This month"],
  ["lastmonth", "Last month"],
  ["year", "This year"],
  ["custom", "Custom range"],
] as const;
export type Preset = (typeof PRESETS)[number][0];

/** the from and to dates (YYYY-MM-DD, both included) for a preset */
export function rangeFor(p: Preset, now: Date): { from: string; to: string } {
  const t = startOfDay(now);
  const y = t.getFullYear();
  const m = t.getMonth();
  switch (p) {
    case "today":
      return { from: dkey(t), to: dkey(t) };
    case "7d":
      return { from: dkey(addDays(t, -6)), to: dkey(t) };
    case "30d":
      return { from: dkey(addDays(t, -29)), to: dkey(t) };
    case "month":
      return { from: dkey(new Date(y, m, 1)), to: dkey(t) };
    case "lastmonth":
      return { from: dkey(new Date(y, m - 1, 1)), to: dkey(new Date(y, m, 0)) };
    case "year":
      return { from: dkey(new Date(y, 0, 1)), to: dkey(t) };
    default:
      return { from: "", to: "" };
  }
}

/** is a timestamp inside the range? */
export function inIso(iso: string, from: string, to: string) {
  const t = new Date(iso).getTime();
  if (from && t < parseKey(from).getTime()) return false;
  if (to && t >= addDays(parseKey(to), 1).getTime()) return false;
  return true;
}

/** is a YYYY-MM-DD date inside the range? */
export const inKey = (k: string, from: string, to: string) => (!from || k >= from) && (!to || k <= to);
