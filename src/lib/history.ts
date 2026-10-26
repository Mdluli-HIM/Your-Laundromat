import { priceOf, type Audit, type Cashup, type Expense, type Method, type Order } from "@/lib/store";
import { dkey } from "@/lib/reports";

/* All of this is made up for the demo. */
const NAMES = [
  "Sipho Dube", "Nomsa Zulu", "Kabelo Molefe", "Zanele Mthembu", "Pieter Joubert", "Anele Ngcobo", "Fatima Essop",
  "Tshepo Mahlangu", "Lindiwe Sithole", "Andre Pretorius", "Busisiwe Mokoena", "Themba Khoza", "Karabo Mabaso",
  "Ayanda Cele", "Johan Kruger", "Naledi Mokwena", "Mpho Radebe", "Refilwe Tau", "Sizwe Ndlovu", "Hannelie Swart",
  "Lerato Phiri", "Bongani Mazibuko", "Chantelle Naidoo", "Dumisani Hlongwane", "Palesa Mohale", "Riaan Venter",
  "Thuli Zondi", "Vusi Mkhize", "Yolanda Botha", "Kagiso Seleka", "Nandi Dlamini", "Wikus Steyn", "Ntombi Shabalala",
  "Jabu Masango", "Elize Marais", "Tebogo Letsoalo", "Zodwa Ncube", "Gerhard Lombard", "Precious Maseko", "Sandile Buthelezi",
];
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DAYS = 400;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type History = { orders: Order[]; audit: Audit[]; expenses: Expense[]; cashups: Cashup[] };
export const EMPTY: History = { orders: [], audit: [], expenses: [], cashups: [] };

export function buildHistory(now: Date): History {
  const nowMs = now.getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const orders: Order[] = [];
  const audit: Audit[] = [];
  const used = new Set<string>();

  for (let d = 0; d <= DAYS; d++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    const wd = day.getDay();
    if (wd === 0) continue; /* closed on Sundays */
    const key = dkey(day);
    const r = rng(hash("orders|" + key));
    const base = wd === 6 ? 7 : 12;
    const growth = 0.7 + 0.3 * (1 - d / DAYS);
    const payday = day.getDate() <= 3 || day.getDate() >= 27 ? 1.25 : 1;
    const n = Math.round(base * growth * payday * (0.75 + r() * 0.5));
    const closeH = wd === 6 ? 14 : 17;

    for (let k = 0; k < n; k++) {
      const hour = 7 + r() * (closeH - 7.5);
      const created = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(hour), Math.floor((hour % 1) * 60));
      const roll = r();
      const service = roll < 0.55 ? "wash_fold" : roll < 0.7 ? "express" : roll < 0.88 ? "ironing" : "duvet";
      const qty =
        service === "ironing" ? 4 + Math.floor(r() * 17) : service === "duvet" ? 1 + Math.floor(r() * 3) : 2 + Math.floor(r() * 17) / 2;
      let col = new Date(created.getTime() + (service === "express" ? 3 + r() * 5 : 20 + r() * 30) * 3600000);
      if (col.getDay() === 0) col = new Date(col.getTime() + 86400000);
      const bad = col.getHours() < 7 || col.getHours() >= (col.getDay() === 6 ? 14 : 17);
      if (bad) col = new Date(col.getFullYear(), col.getMonth(), col.getDate(), 8 + Math.floor(r() * 5), Math.floor(r() * 60));
      const c = Math.floor(Math.pow(r(), 1.8) * NAMES.length);
      const mr = r();
      const method: Method = mr < 0.45 ? "cash" : mr < 0.85 ? "card" : "eft";
      const by = r() < 0.5 ? "Thandi" : "Sipho";
      if (created.getTime() > nowMs || col.getTime() > nowMs) continue;

      let id = "";
      let salt = 0;
      do {
        const h = hash(`${key}|${k}|${salt++}`);
        id = "LH-" + Array.from({ length: 5 }, (_, i) => ALPHA[(h >>> (i * 5)) % ALPHA.length]).join("");
      } while (used.has(id));
      used.add(id);

      const o: Order = {
        id,
        name: NAMES[c],
        phone: "+2782000" + (1000 + c),
        service,
        qty,
        cents: priceOf(service, qty),
        paid: true,
        status: "collected",
        note: "",
        consent: true,
        created: created.toISOString(),
        readyAt: new Date(created.getTime() + (col.getTime() - created.getTime()) * 0.7).toISOString(),
        collectedAt: col.toISOString(),
        method,
        by,
      };
      orders.push(o);

      if (d <= 30) {
        audit.push({ id: `h-${id}-a`, at: o.created, who: by, action: "Order created", ticket: id });
        audit.push({ id: `h-${id}-b`, at: o.collectedAt!, who: by, action: "Collected and paid", ticket: id, detail: `${method}` });
      }
    }
  }

  const expenses: Expense[] = [];
  for (let d = 0; d <= DAYS; d++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    const key = dkey(day);
    const r = rng(hash("exp|" + key));
    const add = (category: string, note: string, cents: number) =>
      expenses.push({ id: `h-${key}-${expenses.length}`, date: key, category, note, cents, by: "Owner" });
    if (day.getDate() === 1) add("Rent", "Monthly rent", 900000);
    if (day.getDay() === 5) add("Wages", "Weekly wages", 620000 + Math.round(r() * 40000));
    if (d % 10 === 3) add("Electricity", "Prepaid electricity", 140000 + Math.round(r() * 80000));
    if (d % 12 === 5) add("Water", "Water bill", 60000 + Math.round(r() * 30000));
    if (d % 14 === 8) add("Detergent and supplies", "Detergent, softener, bags", 180000 + Math.round(r() * 80000));
    if (r() < 0.02) add("Repairs", "Machine repair", 40000 + Math.round(r() * 210000));
  }

  const cashByDay = new Map<string, number>();
  for (const o of orders) {
    if (o.method === "cash" && o.collectedAt) {
      const k = dkey(new Date(o.collectedAt));
      cashByDay.set(k, (cashByDay.get(k) ?? 0) + o.cents);
    }
  }
  const cashups: Cashup[] = [];
  for (let d = 1; d <= 30; d++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    const key = dkey(day);
    const expected = cashByDay.get(key) ?? 0;
    if (!expected) continue;
    const r = rng(hash("cu|" + key));
    const x = r();
    const diff = x < 0.7 ? 0 : x < 0.85 ? -Math.round(100 + r() * 1400) : Math.round(100 + r() * 700);
    cashups.push({ date: key, expected, counted: expected + diff, by: "Thandi", note: "", at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 17, 30).toISOString() });
  }

  return { orders, audit, expenses, cashups };
}
