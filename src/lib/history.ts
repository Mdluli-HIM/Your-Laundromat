import { priceOf, DEFAULT_LOYALTY, type Audit, type Cashup, type Expense, type Method, type Order, type Profile, type Voucher } from "@/lib/store";
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
const DAY = 86400000;
const NOSMS = new Set([11, 27]); /* two customers did not agree to SMS */
const pad = (n: number) => String(n).padStart(2, "0");
const phoneOf = (c: number) => "+2782000" + (1000 + c);

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

/* when each customer started and stopped coming, in days ago. This is what makes some customers
   new, some regulars, some at risk, and some lapsed. */
const START: number[] = [];
const END: number[] = [];
NAMES.forEach((_, c) => {
  const r = rng(hash("win|" + c));
  if (c < 14) {
    START[c] = 300 + Math.floor(r() * 100); /* regulars */
    END[c] = 0;
  } else if (c < 22) {
    START[c] = 220 + Math.floor(r() * 170); /* lapsed */
    END[c] = 70 + Math.floor(r() * 150);
  } else if (c < 24) {
    START[c] = 300; /* at risk */
    END[c] = c === 22 ? 36 : 50;
  } else if (c < 30) {
    START[c] = 200 + Math.floor(r() * 190); /* occasional */
    END[c] = Math.floor(r() * 20);
  } else {
    START[c] = 2 + Math.floor(r() * 40); /* new */
    END[c] = 0;
  }
});
const WEIGHT = (c: number) => (c < 14 ? 6 : c < 24 ? 3 : c < 30 ? 1 : 3);

function pick(r: () => number, d: number): number {
  let total = 0;
  for (let c = 0; c < NAMES.length; c++) if (d <= START[c] && d >= END[c]) total += WEIGHT(c);
  if (!total) return 0;
  let x = r() * total;
  for (let c = 0; c < NAMES.length; c++) {
    if (d <= START[c] && d >= END[c]) {
      x -= WEIGHT(c);
      if (x <= 0) return c;
    }
  }
  return 0;
}

const md = (d: Date) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function buildProfiles(today: Date): Record<string, Profile> {
  const out: Record<string, Profile> = {};
  NAMES.forEach((name, c) => {
    const r = rng(hash("bd|" + c));
    let birthday: string | undefined;
    if (c === 3) birthday = md(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3));
    else if (c === 5) birthday = md(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2));
    else if (c % 3 !== 0) birthday = `${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 28))}`;
    out[phoneOf(c)] = { name, birthday, consent: !NOSMS.has(c) };
  });
  return out;
}

/* past vouchers, so the loyalty screens have a story. Upcoming birthdays are issued live. */
function buildVouchers(orders: Order[], profiles: Record<string, Profile>, now: Date): Voucher[] {
  const L = DEFAULT_LOYALTY;
  const nowMs = now.getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: Voucher[] = [];
  const used = new Set<string>();

  const first: Record<string, number> = {};
  for (const o of orders) {
    const t = new Date(o.created).getTime();
    if (!first[o.phone] || t < first[o.phone]) first[o.phone] = t;
  }

  const code = (seed: string) => {
    let n = 0;
    let c = "";
    do {
      const h = hash(seed + "|" + n++);
      c = "LV-" + Array.from({ length: 4 }, (_, i) => ALPHA[(h >>> (i * 5)) % ALPHA.length]).join("");
    } while (used.has(c));
    used.add(c);
    return c;
  };
  const add = (phone: string, kind: Voucher["kind"], value: number, reason: Voucher["reason"], tag: string, issued: Date) => {
    if (issued.getTime() < (first[phone] ?? Infinity)) return;
    const p = profiles[phone];
    const expires = new Date(issued.getTime() + L.validDays * DAY);
    const r = rng(hash("v|" + phone + tag));
    let redeemedAt: string | undefined;
    if (r() < (expires.getTime() < nowMs ? 0.6 : 0.35)) {
      const at = new Date(issued.getTime() + (3 + r() * 40) * DAY);
      if (at.getTime() < Math.min(expires.getTime(), nowMs)) redeemedAt = at.toISOString();
    }
    out.push({
      code: code(phone + tag), phone, name: p?.name ?? "", kind, value, reason, tag,
      issued: issued.toISOString(), expires: expires.toISOString(), redeemedAt, sms: p?.consent !== false,
    });
  };

  for (const [phone, p] of Object.entries(profiles)) {
    if (!p.birthday) continue;
    const [m, d] = p.birthday.split("-").map(Number);
    for (const yr of [today.getFullYear() - 1, today.getFullYear()]) {
      const bday = new Date(yr, m - 1, d);
      if (bday.getTime() >= today.getTime()) continue;
      const issued = new Date(bday.getTime() - L.birthday.daysBefore * DAY);
      if (issued.getTime() < nowMs - 380 * DAY) continue;
      add(phone, "percent", L.birthday.pct, "birthday", `birthday-${yr}`, issued);
    }
  }

  const by: Record<string, Order[]> = {};
  for (const o of orders) (by[o.phone] ??= []).push(o);
  for (const [phone, list] of Object.entries(by)) {
    list.sort((a, b) => (a.collectedAt ?? "").localeCompare(b.collectedAt ?? ""));
    let spent = 0;
    list.forEach((o, i) => {
      const n = i + 1;
      const before = spent;
      spent += o.cents;
      const at = new Date(o.collectedAt ?? o.created);
      if (at.getTime() < nowMs - 120 * DAY) return;
      if (n % L.visits.every === 0) add(phone, "rand", L.visits.cents, "visits", `visits-${n}`, at);
      const a = Math.floor(spent / L.spend.every);
      const b = Math.floor(before / L.spend.every);
      if (a > b) add(phone, "rand", L.spend.cents, "spend", `spend-${a}`, at);
    });
  }
  return out.sort((a, b) => b.issued.localeCompare(a.issued));
}

export type History = {
  orders: Order[];
  audit: Audit[];
  expenses: Expense[];
  cashups: Cashup[];
  profiles: Record<string, Profile>;
  vouchers: Voucher[];
};
export const EMPTY: History = { orders: [], audit: [], expenses: [], cashups: [], profiles: {}, vouchers: [] };

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
      const c = pick(r, d);
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
        phone: phoneOf(c),
        service,
        qty,
        cents: priceOf(service, qty),
        paid: true,
        status: "collected",
        note: "",
        consent: !NOSMS.has(c),
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

  const profiles = buildProfiles(today);
  const vouchers = buildVouchers(orders, profiles, now);
  return { orders, audit, expenses, cashups, profiles, vouchers };
}
