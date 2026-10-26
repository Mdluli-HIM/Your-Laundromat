import type { Expense, Order } from "@/lib/store";

const pad = (n: number) => String(n).padStart(2, "0");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const dkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export type Sum = { cents: number; count: number };

const inRange = (iso: string | undefined, from: Date, to: Date) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
};

/** income is counted on the day the customer collected and paid */
export function paidBetween(orders: Order[], from: Date, to: Date): Sum {
  let cents = 0;
  let count = 0;
  for (const o of orders) {
    if (o.paid && inRange(o.collectedAt, from, to)) {
      cents += o.cents;
      count++;
    }
  }
  return { cents, count };
}

export function spentBetween(expenses: Expense[], from: Date, to: Date) {
  let cents = 0;
  for (const e of expenses) {
    const t = parseKey(e.date).getTime();
    if (t >= from.getTime() && t < to.getTime()) cents += e.cents;
  }
  return cents;
}

export const change = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

export type Period = { key: string; label: string; prevLabel: string; cur: Sum; prev: Sum };

/** each period so far, against the same stretch of the period before it */
export function periods(orders: Order[], now: Date): Period[] {
  const end = new Date(now.getTime() + 1);
  const t0 = startOfDay(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const defs = [
    { key: "today", label: "Today", prevLabel: "yesterday", start: t0, prevStart: addDays(t0, -1) },
    { key: "week", label: "This week", prevLabel: "last week", start: mondayOf(now), prevStart: addDays(mondayOf(now), -7) },
    { key: "month", label: "This month", prevLabel: "last month", start: new Date(y, m, 1), prevStart: new Date(y, m - 1, 1) },
    { key: "year", label: "This year", prevLabel: "last year", start: new Date(y, 0, 1), prevStart: new Date(y - 1, 0, 1) },
  ];
  return defs.map((d) => {
    const span = end.getTime() - d.start.getTime();
    return {
      key: d.key,
      label: d.label,
      prevLabel: d.prevLabel,
      cur: paidBetween(orders, d.start, end),
      prev: paidBetween(orders, d.prevStart, new Date(d.prevStart.getTime() + span)),
    };
  });
}

export type Mode = "day" | "week" | "month";
export type Bar = { label: string; full: string; cents: number; count: number };

export function series(orders: Order[], mode: Mode, now: Date): Bar[] {
  const t0 = startOfDay(now);
  const out: Bar[] = [];
  const push = (from: Date, to: Date, label: string, full: string) => {
    const s = paidBetween(orders, from, to);
    out.push({ label, full, cents: s.cents, count: s.count });
  };
  if (mode === "day") {
    for (let i = 29; i >= 0; i--) {
      const f = addDays(t0, -i);
      push(f, addDays(f, 1), String(f.getDate()), f.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }));
    }
  } else if (mode === "week") {
    for (let i = 11; i >= 0; i--) {
      const f = addDays(mondayOf(now), -7 * i);
      push(f, addDays(f, 7), `${f.getDate()} ${MON[f.getMonth()]}`, `Week of ${f.getDate()} ${MON[f.getMonth()]}`);
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const f = new Date(now.getFullYear(), now.getMonth() - i, 1);
      push(f, new Date(f.getFullYear(), f.getMonth() + 1, 1), MON[f.getMonth()], `${MON[f.getMonth()]} ${f.getFullYear()}`);
    }
  }
  return out;
}

export function byService(orders: Order[], from: Date, to: Date) {
  const m = new Map<string, { cents: number; count: number }>();
  for (const o of orders) {
    if (o.paid && inRange(o.collectedAt, from, to)) {
      const x = m.get(o.service) ?? { cents: 0, count: 0 };
      x.cents += o.cents;
      x.count++;
      m.set(o.service, x);
    }
  }
  return [...m].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.cents - a.cents);
}

export function topCustomers(orders: Order[], from: Date, to: Date, n = 5) {
  const m = new Map<string, { name: string; cents: number; count: number }>();
  for (const o of orders) {
    if (!inRange(o.created, from, to)) continue;
    const x = m.get(o.phone) ?? { name: o.name, cents: 0, count: 0 };
    x.cents += o.cents;
    x.count++;
    m.set(o.phone, x);
  }
  const all = [...m.values()];
  const repeat = all.length ? Math.round((all.filter((c) => c.count >= 2).length / all.length) * 100) : 0;
  return { top: all.sort((a, b) => b.cents - a.cents).slice(0, n), repeat, customers: all.length };
}

export function busiest(orders: Order[], from: Date, to: Date) {
  const c = [0, 0, 0, 0, 0, 0];
  for (const o of orders) {
    if (!inRange(o.created, from, to)) continue;
    const wd = new Date(o.created).getDay();
    if (wd >= 1 && wd <= 6) c[wd - 1]++;
  }
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => ({ label, count: c[i] }));
}
