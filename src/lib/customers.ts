import { voucherStatus, type Order, type Profile, type Reason, type Voucher } from "@/lib/store";

const DAY = 86400000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* change these to match how the shop thinks about "gone quiet" */
export const RULES = { newDays: 30, activeDays: 30, atRiskDays: 60 };

export type CStatus = "new" | "active" | "atrisk" | "lapsed";
export const STATUS_LABEL: Record<CStatus, string> = { new: "New", active: "Active", atrisk: "At risk", lapsed: "Lapsed" };
export const STATUS_HINT: Record<CStatus, string> = {
  new: "First visit in the last 30 days",
  active: "Visited in the last 30 days",
  atrisk: "Last visit 31 to 60 days ago",
  lapsed: "Not seen for over 60 days",
};
export const REASON_LABEL: Record<Reason, string> = {
  birthday: "Birthday",
  visits: "Visit milestone",
  spend: "Spend milestone",
  winback: "Win-back",
  manual: "Given by staff",
};

export type Customer = {
  phone: string;
  name: string;
  visits: number;
  spent: number;
  first: string;
  last: string;
  days: number;
  status: CStatus;
  birthday?: string;
  consent: boolean;
  vouchers: number;
};

/** one row per phone number, built from every order ever placed */
export function buildCustomers(all: Order[], profiles: Record<string, Profile>, vouchers: Voucher[], now: number): Customer[] {
  const map = new Map<string, Customer>();
  for (const o of all) {
    const t = new Date(o.created).getTime();
    let c = map.get(o.phone);
    if (!c) {
      c = { phone: o.phone, name: o.name, visits: 0, spent: 0, first: o.created, last: o.created, days: 0, status: "active", consent: true, vouchers: 0 };
      map.set(o.phone, c);
    }
    c.visits++;
    if (o.paid) c.spent += o.cents;
    if (t < new Date(c.first).getTime()) c.first = o.created;
    if (t > new Date(c.last).getTime()) {
      c.last = o.created;
      c.name = o.name;
    }
  }
  const live = new Map<string, number>();
  for (const v of vouchers) {
    if (voucherStatus(v, now) === "active") live.set(v.phone, (live.get(v.phone) ?? 0) + 1);
  }
  for (const c of map.values()) {
    const p = profiles[c.phone];
    c.birthday = p?.birthday;
    c.consent = p ? p.consent : true;
    c.vouchers = live.get(c.phone) ?? 0;
    c.days = Math.max(0, Math.floor((now - new Date(c.last).getTime()) / DAY));
    const sinceFirst = Math.floor((now - new Date(c.first).getTime()) / DAY);
    c.status =
      sinceFirst <= RULES.newDays ? "new" : c.days <= RULES.activeDays ? "active" : c.days <= RULES.atRiskDays ? "atrisk" : "lapsed";
  }
  return [...map.values()];
}

export const bdayLabel = (b?: string) => {
  if (!b) return "—";
  const [m, d] = b.split("-").map(Number);
  return `${d} ${MON[m - 1]}`;
};

export function nextBirthday(b: string, now: number) {
  const [m, d] = b.split("-").map(Number);
  const t = new Date(now);
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  let next = new Date(t.getFullYear(), m - 1, d);
  if (next.getTime() < today.getTime()) next = new Date(t.getFullYear() + 1, m - 1, d);
  return { days: Math.round((next.getTime() - today.getTime()) / DAY), year: next.getFullYear() };
}
