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
};
export type SmsKind = "received" | "ready" | "reminder";
export type Sms = { id: string; ticket: string; to: string; kind: SmsKind; body: string; at: string };
export type Audit = { id: string; at: string; who: string; action: string; ticket?: string; detail?: string };
export type Expense = { id: string; date: string; category: string; note: string; cents: number; by: string };
export type Cashup = { date: string; expected: number; counted: number; by: string; note: string; at: string };

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
};
const VERSION = "2";

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
function log(action: string, ticket?: string, detail?: string) {
  const list = read<Audit[]>(K.audit, []);
  list.push({ id: Math.random().toString(36).slice(2), at: new Date().toISOString(), who: getWho(), action, ticket, detail });
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
      localStorage.setItem(K.sms, "[]");
      localStorage.setItem(K.audit, "[]");
      localStorage.setItem(K.exp, "[]");
      localStorage.setItem(K.cash, "[]");
      localStorage.setItem(K.ver, VERSION);
    }
  } catch {}
}
export const loadOrders = () => read<Order[]>(K.orders, []);
export const loadSms = () => read<Sms[]>(K.sms, []);
export const loadAudit = () => read<Audit[]>(K.audit, []);
export const loadExpenses = () => read<Expense[]>(K.exp, []);
export const loadCashups = () => read<Cashup[]>(K.cash, []);

export function resetDemo() {
  try {
    [K.sms, K.audit, K.exp, K.cash].forEach((k) => localStorage.setItem(k, "[]"));
    localStorage.setItem(K.ver, VERSION);
  } catch {}
  write(K.orders, seed());
}

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ticket = () => "LW-" + Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");

/* the messages a real system would send. Plain text keeps each SMS to one part. */
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
  const list = read<Sms[]>(K.sms, []);
  list.push({ id: Math.random().toString(36).slice(2), ticket: o.id, to: o.phone, kind, body, at: new Date().toISOString() });
  write(K.sms, list);
}

export function createOrder(i: { name: string; phone: string; service: string; qty: number; note: string; consent: boolean }) {
  const list = loadOrders();
  let id = ticket();
  while (list.some((o) => o.id === id)) id = ticket();
  const o: Order = {
    id, name: i.name, phone: i.phone, service: i.service, qty: i.qty,
    cents: priceOf(i.service, i.qty), paid: false, status: "received",
    note: i.note, consent: i.consent, created: new Date().toISOString(), by: getWho(),
  };
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

export function collect(id: string, method: Method = "cash") {
  const list = loadOrders();
  const o = list.find((x) => x.id === id);
  if (!o) return;
  o.status = "collected";
  o.paid = true;
  o.method = method;
  o.by = getWho();
  o.collectedAt = new Date().toISOString();
  log("Collected and paid", id, `${rand(o.cents)} by ${method}`);
  write(K.orders, list);
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
