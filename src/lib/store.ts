import { services, shop } from "@/data/shop";
import { getShopName } from "@/lib/brand";
import { LABEL, nextStatus, type Status } from "@/lib/status";
import { rand } from "@/lib/format";

export type Method = "cash" | "card" | "eft";
export type Order = {
  id: string;
  name: string;
  phone: string;
  service: string;
  qty: number;
  cents: number;
  paid: boolean;
  status: Status;
  note: string;
  consent: boolean;
  created: string;
  readyAt?: string;
  collectedAt?: string;
  method?: Method;
  by?: string;
  discount?: number;
  voucher?: string;
};
export type SmsKind = "received" | "ready" | "reminder" | "voucher";
export type Sms = { id: string; ticket: string; to: string; kind: SmsKind; body: string; at: string };
export type Audit = { id: string; at: string; who: string; action: string; ticket?: string; detail?: string };
export type Expense = { id: string; date: string; category: string; note: string; cents: number; by: string };
export type Cashup = { date: string; expected: number; counted: number; by: string; note: string; at: string };

/* customers, and loyalty */
export type Profile = { name: string; birthday?: string; consent: boolean };
export type Reason = "birthday" | "visits" | "spend" | "winback" | "manual";
export type Voucher = {
  code: string;
  phone: string;
  name: string;
  kind: "percent" | "rand";
  /** a percentage, or an amount in cents */
  value: number;
  reason: Reason;
  tag: string;
  issued: string;
  expires: string;
  redeemedAt?: string;
  orderId?: string;
  sms: boolean;
};
export type Loyalty = {
  on: boolean;
  birthday: { on: boolean; pct: number; daysBefore: number };
  visits: { on: boolean; every: number; cents: number };
  spend: { on: boolean; every: number; cents: number };
  winback: { pct: number };
  validDays: number;
};
export const DEFAULT_LOYALTY: Loyalty = {
  on: true,
  birthday: { on: true, pct: 15, daysBefore: 7 },
  visits: { on: true, every: 10, cents: 5000 },
  spend: { on: true, every: 200000, cents: 10000 },
  winback: { pct: 10 },
  validDays: 60,
};

export const STAFF = ["Thandi", "Sipho", "Owner"];
export const CATEGORIES = ["Rent", "Wages", "Electricity", "Water", "Detergent and supplies", "Repairs", "Other"];

const K = {
  orders: "laundry:orders",
  sms: "laundry:sms",
  audit: "laundry:audit",
  exp: "laundry:exp",
  cash: "laundry:cash",
  who: "laundry:who",
  ver: "laundry:v",
  prof: "laundry:prof",
  vouch: "laundry:vouch",
  vseed: "laundry:vseed",
  loy: "laundry:loy",
};
const VERSION = "3";
const DAY = 86400000;

function read<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event("laundry:update"));
}

export function getWho() {
  try {
    return localStorage.getItem(K.who) || "Thandi";
  } catch {
    return "Thandi";
  }
}
export function setWho(n: string) {
  try {
    localStorage.setItem(K.who, n);
  } catch {}
  window.dispatchEvent(new Event("laundry:update"));
}

/* every change is recorded here. In the real build this table cannot be edited or deleted. */
function log(action: string, ticket?: string, detail?: string, who?: string) {
  const list = read<Audit[]>(K.audit, []);
  list.push({ id: Math.random().toString(36).slice(2), at: new Date().toISOString(), who: who ?? getWho(), action, ticket, detail });
  try {
    localStorage.setItem(K.audit, JSON.stringify(list));
  } catch {}
}

export const priceOf = (service: string, qty: number) =>
  Math.round((services.find((s) => s.id === service)?.cents ?? 0) * qty);

const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const mk = (
  id: string, name: string, phone: string, service: string, qty: number,
  status: Status, created: number, extra: Partial<Order> = {}
): Order => ({
  id, name, phone, service, qty, cents: priceOf(service, qty), paid: false, status,
  note: "", consent: true, created: minsAgo(created), by: "Thandi", ...extra,
});

/* made-up customers and numbers */
const seed = (): Order[] => [
  mk("LW-4K7Q", "Sipho Mokoena", "+27820000101", "wash_fold", 6.5, "received", 20),
  mk("LW-9T2M", "Naledi Khumalo", "+27820000102", "wash_fold", 4, "washing", 75),
  mk("LW-3F8R", "Johan van der Merwe", "+27820000103", "duvet", 2, "washing", 110),
  mk("LW-7B5X", "Thandi Nkosi", "+27820000104", "express", 3.2, "drying", 150),
  mk("LW-2D6V", "Pieter Botha", "+27820000105", "ironing", 12, "folding", 200),
  mk("LW-8H3N", "Aisha Patel", "+27820000106", "wash_fold", 8, "ready", 320, { readyAt: minsAgo(60) }),
  mk("LW-5J9W", "Lwazi Dlamini", "+27820000107", "wash_fold", 5.5, "ready", 3000, { readyAt: minsAgo(2700) }),
  mk("LW-6C4Y", "Ruan Smit", "+27820000108", "express", 2.5, "collected", 400, {
    paid: true, method: "card", readyAt: minsAgo(120), collectedAt: minsAgo(30),
  }),
];

export function ensureSeed() {
  try {
    if (localStorage.getItem(K.ver) !== VERSION) {
      localStorage.setItem(K.orders, JSON.stringify(seed()));
      [K.sms, K.audit, K.exp, K.cash, K.vouch].forEach((k) => localStorage.setItem(k, "[]"));
      localStorage.setItem(K.prof, "{}");
      localStorage.removeItem(K.vseed);
      localStorage.removeItem(K.loy);
      localStorage.setItem(K.ver, VERSION);
    }
  } catch {}
}
export const loadOrders = () => read<Order[]>(K.orders, []);
export const loadSms = () => read<Sms[]>(K.sms, []);
export const loadAudit = () => read<Audit[]>(K.audit, []);
export const loadExpenses = () => read<Expense[]>(K.exp, []);
export const loadCashups = () => read<Cashup[]>(K.cash, []);
export const loadProfiles = () => read<Record<string, Profile>>(K.prof, {});
export const loadVouchers = () => read<Voucher[]>(K.vouch, []);

export function loadLoyalty(): Loyalty {
  const s = read<Partial<Loyalty>>(K.loy, {});
  return {
    ...DEFAULT_LOYALTY,
    ...s,
    birthday: { ...DEFAULT_LOYALTY.birthday, ...s.birthday },
    visits: { ...DEFAULT_LOYALTY.visits, ...s.visits },
    spend: { ...DEFAULT_LOYALTY.spend, ...s.spend },
    winback: { ...DEFAULT_LOYALTY.winback, ...s.winback },
  };
}
export const saveLoyalty = (l: Loyalty) => write(K.loy, l);

export function resetDemo() {
  try {
    [K.sms, K.audit, K.exp, K.cash, K.vouch].forEach((k) => localStorage.setItem(k, "[]"));
    localStorage.setItem(K.prof, "{}");
    localStorage.removeItem(K.vseed);
    localStorage.removeItem(K.loy);
    localStorage.setItem(K.ver, VERSION);
  } catch {}
  write(K.orders, seed());
}

/* ---------- vouchers ---------- */
export type VStatus = "active" | "redeemed" | "expired";
export const voucherStatus = (v: Voucher, now: number): VStatus =>
  v.redeemedAt ? "redeemed" : new Date(v.expires).getTime() < now ? "expired" : "active";
export const voucherLabel = (v: Pick<Voucher, "kind" | "value">) =>
  v.kind === "percent" ? `${v.value}% off` : `${rand(v.value)} off`;
export const discountFor = (v: Pick<Voucher, "kind" | "value">, cents: number) =>
  v.kind === "percent" ? Math.round((cents * v.value) / 100) : Math.min(v.value, cents);

/* the history of sample orders is registered here, so milestones count past visits too */
let histOrders: Order[] = [];
let histProfiles: Record<string, Profile> = {};
export function setHistory(h: { orders: Order[]; profiles: Record<string, Profile> }) {
  histOrders = h.orders;
  histProfiles = h.profiles;
}

export function getProfile(phone: string): Profile | undefined {
  const live = loadProfiles()[phone];
  const old = histProfiles[phone];
  if (!live && !old) return undefined;
  return {
    name: live?.name ?? old?.name ?? "",
    birthday: live?.birthday ?? old?.birthday,
    consent: live ? live.consent : (old?.consent ?? true),
  };
}
export function setProfile(phone: string, p: Profile) {
  const m = loadProfiles();
  m[phone] = p;
  write(K.prof, m);
}

const CODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const vcode = () => "LV-" + Array.from({ length: 4 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join("");
const hasTag = (phone: string, tag: string) => loadVouchers().some((v) => v.phone === phone && v.tag === tag);

function sendSms(to: string, ticket: string, kind: SmsKind, body: string) {
  const list = read<Sms[]>(K.sms, []);
  list.push({ id: Math.random().toString(36).slice(2), ticket, to, kind, body, at: new Date().toISOString() });
  write(K.sms, list);
}

/* plain text, so it stays one SMS wherever possible */
export function voucherText(v: Voucher) {
  const first = v.name.split(" ")[0];
  const until = new Date(v.expires).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  const what = voucherLabel(v);
  const lead =
    v.reason === "birthday"
      ? `Happy birthday ${first}! Enjoy ${what} your next order.`
      : v.reason === "winback"
        ? `We miss you ${first}! Enjoy ${what} your next order.`
        : v.reason === "manual"
          ? `${first}, here is ${what} your next order.`
          : `Thank you for being a regular, ${first}! Enjoy ${what} your next order.`;
  return `${getShopName()}: ${lead} Voucher ${v.code}, valid until ${until}. Show it at the counter.`;
}

function issue(phone: string, name: string, kind: Voucher["kind"], value: number, reason: Reason, tag: string, by: string): Voucher {
  const list = loadVouchers();
  let code = vcode();
  while (list.some((x) => x.code === code)) code = vcode();
  const issued = new Date();
  const v: Voucher = {
    code, phone, name, kind, value, reason, tag,
    issued: issued.toISOString(),
    expires: new Date(issued.getTime() + loadLoyalty().validDays * DAY).toISOString(),
    sms: false,
  };
  if (getProfile(phone)?.consent !== false) {
    sendSms(phone, "", "voucher", voucherText(v));
    v.sms = true;
  }
  list.push(v);
  write(K.vouch, list);
  log("Voucher issued", undefined, `${v.code}, ${voucherLabel(v)} to ${name} (${reason})`, by);
  return v;
}

/** staff give a customer a voucher by hand */
export function giveVoucher(phone: string, name: string, kind: Voucher["kind"], value: number) {
  return issue(phone, name, kind, value, "manual", `manual-${Date.now()}`, getWho());
}

/** a discount for a customer who has gone quiet. One every 30 days at most. */
export function sendWinback(phone: string, name: string): Voucher | null {
  const tag = `winback-${Math.floor(Date.now() / (30 * DAY))}`;
  if (hasTag(phone, tag)) return null;
  return issue(phone, name, "percent", loadLoyalty().winback.pct, "winback", tag, getWho());
}

/** birthday vouchers go out a few days before the birthday, once a year per customer */
export function runBirthdayCheck(now: Date): number {
  const loy = loadLoyalty();
  if (!loy.on || !loy.birthday.on) return 0;
  const profiles = { ...histProfiles, ...loadProfiles() };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let n = 0;
  for (const [phone, p] of Object.entries(profiles)) {
    if (!p.birthday) continue;
    const [m, d] = p.birthday.split("-").map(Number);
    let next = new Date(now.getFullYear(), m - 1, d);
    if (next.getTime() < today.getTime()) next = new Date(now.getFullYear() + 1, m - 1, d);
    const days = Math.round((next.getTime() - today.getTime()) / DAY);
    if (days > loy.birthday.daysBefore) continue;
    const tag = `birthday-${next.getFullYear()}`;
    if (hasTag(phone, tag)) continue;
    issue(phone, p.name, "percent", loy.birthday.pct, "birthday", tag, "System");
    n++;
  }
  return n;
}

export const vouchersSeeded = () => {
  try {
    return localStorage.getItem(K.vseed) === VERSION;
  } catch {
    return true;
  }
};
export function seedVouchers(list: Voucher[]) {
  try {
    localStorage.setItem(K.vseed, VERSION);
  } catch {}
  write(K.vouch, [...loadVouchers(), ...list]);
}

/* ---------- orders ---------- */
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ticket = () => "LW-" + Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");

/* the messages a real system would send */
function pushSms(o: Order, kind: SmsKind) {
  if (!o.consent) return;
  const name = getShopName();
  const link = `${location.origin}/track?t=${o.id}`;
  const due = o.paid ? "Paid, thank you" : `Amount due ${rand(o.cents)}`;
  const body =
    kind === "received"
      ? `${name}: we have your laundry. Order ${o.id}. Track it: ${link}`
      : kind === "ready"
        ? `${name}: order ${o.id} is ready to collect. ${due}. Open ${shop.hours}. ${link}`
        : `${name}: reminder, order ${o.id} is still waiting for collection. Open ${shop.hours}.`;
  sendSms(o.phone, o.id, kind, body);
}

export function createOrder(i: {
  name: string; phone: string; service: string; qty: number; note: string; consent: boolean;
  birthday?: string; voucher?: string;
}) {
  const list = loadOrders();
  let id = ticket();
  while (list.some((o) => o.id === id)) id = ticket();

  const gross = priceOf(i.service, i.qty);
  let discount = 0;
  let used: string | undefined;
  if (i.voucher) {
    const vs = loadVouchers();
    const v = vs.find((x) => x.code === i.voucher && x.phone === i.phone);
    if (v && voucherStatus(v, Date.now()) === "active") {
      discount = discountFor(v, gross);
      v.redeemedAt = new Date().toISOString();
      v.orderId = id;
      used = v.code;
      write(K.vouch, vs);
      log("Voucher applied", id, `${v.code}, ${voucherLabel(v)}`);
    }
  }

  const o: Order = {
    id, name: i.name, phone: i.phone, service: i.service, qty: i.qty,
    cents: gross - discount, paid: false, status: "received",
    note: i.note, consent: i.consent, created: new Date().toISOString(), by: getWho(),
    discount: discount || undefined, voucher: used,
  };
  setProfile(i.phone, { name: i.name, birthday: i.birthday || getProfile(i.phone)?.birthday, consent: i.consent });
  log("Order created", id, `${services.find((s) => s.id === i.service)?.name}, ${rand(o.cents)}`);
  write(K.orders, [...list, o]);
  pushSms(o, "received");
  return o;
}

export function advance(id: string) {
  const list = loadOrders();
  const o = list.find((x) => x.id === id);
  if (!o) return;
  const n = nextStatus(o.status);
  if (!n || n === "collected") return;
  o.status = n;
  if (n === "ready") o.readyAt = new Date().toISOString();
  log(`Moved to ${LABEL[n]}`, id);
  write(K.orders, list);
  if (n === "ready") pushSms(o, "ready");
}

/* a collected order can earn the customer a voucher */
function earnVouchers(o: Order, live: Order[]): Voucher[] {
  const loy = loadLoyalty();
  if (!loy.on) return [];
  const prior = [...histOrders, ...live].filter((x) => x.phone === o.phone && x.status === "collected" && x.id !== o.id);
  const visits = prior.length + 1;
  const before = prior.reduce((s, x) => s + (x.paid ? x.cents : 0), 0);
  const after = before + o.cents;
  const out: Voucher[] = [];

  if (loy.visits.on && loy.visits.every > 0 && visits % loy.visits.every === 0 && !hasTag(o.phone, `visits-${visits}`)) {
    out.push(issue(o.phone, o.name, "rand", loy.visits.cents, "visits", `visits-${visits}`, "System"));
  }
  if (loy.spend.on && loy.spend.every > 0) {
    const a = Math.floor(after / loy.spend.every);
    const b = Math.floor(before / loy.spend.every);
    if (a > b && !hasTag(o.phone, `spend-${a}`)) {
      out.push(issue(o.phone, o.name, "rand", loy.spend.cents, "spend", `spend-${a}`, "System"));
    }
  }
  return out;
}

export function collect(id: string, method: Method = "cash"): Voucher[] {
  const list = loadOrders();
  const o = list.find((x) => x.id === id);
  if (!o) return [];
  o.status = "collected";
  o.paid = true;
  o.method = method;
  o.by = getWho();
  o.collectedAt = new Date().toISOString();
  log("Collected and paid", id, `${rand(o.cents)} by ${method}`);
  write(K.orders, list);
  return earnVouchers(o, list);
}

export function remind(id: string) {
  const o = loadOrders().find((x) => x.id === id);
  if (!o) return;
  log("Sent reminder SMS", id);
  pushSms(o, "reminder");
}

export function addExpense(e: { date: string; category: string; note: string; cents: number }) {
  const list = read<Expense[]>(K.exp, []);
  list.push({ ...e, id: Math.random().toString(36).slice(2), by: getWho() });
  log("Recorded expense", undefined, `${e.category}, ${rand(e.cents)}`);
  write(K.exp, list);
}

export function addCashup(c: { date: string; expected: number; counted: number; note: string }) {
  const list = read<Cashup[]>(K.cash, []);
  list.push({ ...c, by: getWho(), at: new Date().toISOString() });
  const diff = c.counted - c.expected;
  log("Cash-up submitted", undefined, diff === 0 ? "Balanced" : `Difference ${rand(diff)}`);
  write(K.cash, list);
}
