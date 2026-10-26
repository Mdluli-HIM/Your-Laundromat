import { services, shop } from "@/data/shop";
import { getShopName } from "@/lib/brand";
import { nextStatus, type Status } from "@/lib/status";
import { rand } from "@/lib/format";

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
};
export type SmsKind = "received" | "ready" | "reminder";
export type Sms = { id: string; ticket: string; to: string; kind: SmsKind; body: string; at: string };

const OK = "laundry:orders";
const SK = "laundry:sms";

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

export const priceOf = (service: string, qty: number) =>
  Math.round((services.find((s) => s.id === service)?.cents ?? 0) * qty);

const minsAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const mk = (
  id: string, name: string, phone: string, service: string, qty: number,
  status: Status, created: number, extra: Partial<Order> = {}
): Order => ({
  id, name, phone, service, qty, cents: priceOf(service, qty), paid: false, status,
  note: "", consent: true, created: minsAgo(created), ...extra,
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
    paid: true, readyAt: minsAgo(120), collectedAt: minsAgo(30),
  }),
];

export function ensureSeed() {
  try {
    if (localStorage.getItem(OK) === null) {
      localStorage.setItem(OK, JSON.stringify(seed()));
      localStorage.setItem(SK, "[]");
    }
  } catch {}
}
export const loadOrders = () => read<Order[]>(OK, []);
export const loadSms = () => read<Sms[]>(SK, []);
export function resetDemo() {
  write(SK, []);
  write(OK, seed());
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
  const list = read<Sms[]>(SK, []);
  list.push({ id: Math.random().toString(36).slice(2), ticket: o.id, to: o.phone, kind, body, at: new Date().toISOString() });
  write(SK, list);
}

export function createOrder(i: { name: string; phone: string; service: string; qty: number; note: string; consent: boolean }) {
  const list = loadOrders();
  let id = ticket();
  while (list.some((o) => o.id === id)) id = ticket();
  const o: Order = {
    id, name: i.name, phone: i.phone, service: i.service, qty: i.qty,
    cents: priceOf(i.service, i.qty), paid: false, status: "received",
    note: i.note, consent: i.consent, created: new Date().toISOString(),
  };
  write(OK, [...list, o]);
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
  write(OK, list);
  if (n === "ready") pushSms(o, "ready");
}

export function collect(id: string) {
  const list = loadOrders();
  const o = list.find((x) => x.id === id);
  if (!o) return;
  o.status = "collected";
  o.paid = true;
  o.collectedAt = new Date().toISOString();
  write(OK, list);
}

export function remind(id: string) {
  const o = loadOrders().find((x) => x.id === id);
  if (o) pushSms(o, "reminder");
}
