"use client";
import { useMemo, useState } from "react";
import { services } from "@/data/shop";
import { LABEL, STATUSES } from "@/lib/status";
import { rand, dayLong } from "@/lib/format";
import { showPhone } from "@/lib/phone";
import { dkey } from "@/lib/reports";
import { inIso } from "@/lib/filters";
import { slicePage } from "@/lib/paging";
import { useDateRange } from "@/lib/useDateRange";
import type { Order } from "@/lib/store";
import Pager from "@/components/owner/Pager";
import FilterChips, { type Chip } from "@/components/owner/FilterChips";
import DateRangeField from "@/components/owner/DateRangeField";

type SortKey = "created" | "customer" | "amount" | "status";

const safe = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; /* stops spreadsheet formulas in exported text */
  return `"${s.replace(/"/g, '""')}"`;
};

export default function Records({ all, now }: { all: Order[]; now: Date }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [method, setMethod] = useState("");
  const [who, setWho] = useState("");
  const [amin, setAmin] = useState("");
  const [amax, setAmax] = useState("");
  const r = useDateRange(now);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "created", dir: -1 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const reset = () => setPage(0);
  const on = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    set(e.target.value);
    reset();
  };

  const people = useMemo(() => [...new Set(all.map((o) => o.by).filter((x): x is string => !!x))].sort(), [all]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const lo = parseFloat(amin.replace(",", "."));
    const hi = parseFloat(amax.replace(",", "."));
    const out = all.filter((o) => {
      if (!inIso(o.created, r.from, r.to)) return false;
      if (status === "open") {
        if (o.status === "collected") return false;
      } else if (status && o.status !== status) return false;
      if (service && o.service !== service) return false;
      if (method && o.method !== method) return false;
      if (who && o.by !== who) return false;
      if (lo >= 0 && o.cents < Math.round(lo * 100)) return false;
      if (hi >= 0 && o.cents > Math.round(hi * 100)) return false;
      if (!s) return true;
      const p = o.phone.replace(/\D/g, "");
      return (
        o.id.toLowerCase().includes(s) ||
        o.name.toLowerCase().includes(s) ||
        (digits.length > 0 && (p.includes(digits) || ("0" + p.slice(2)).includes(digits)))
      );
    });
    out.sort((a, b) => {
      let c = 0;
      if (sort.key === "created") c = a.created.localeCompare(b.created);
      else if (sort.key === "customer") c = a.name.localeCompare(b.name);
      else if (sort.key === "amount") c = a.cents - b.cents;
      else c = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      return c * sort.dir || b.created.localeCompare(a.created);
    });
    return out;
  }, [all, q, status, service, method, who, amin, amax, r.from, r.to, sort]);

  const value = rows.reduce((s, o) => s + o.cents, 0);
  const paid = rows.filter((o) => o.paid).reduce((s, o) => s + o.cents, 0);
  const shown = slicePage(rows, page, size);

  const toggle = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "created" || key === "amount" ? -1 : 1 }));
    reset();
  };
  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="sort" onClick={() => toggle(key)}>
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  const chips: Chip[] = [];
  if (q.trim()) chips.push({ label: `Search: ${q.trim()}`, clear: () => { setQ(""); reset(); } });
  if (status) chips.push({ label: status === "open" ? "Not collected yet" : LABEL[status as keyof typeof LABEL], clear: () => { setStatus(""); reset(); } });
  if (service) chips.push({ label: services.find((s) => s.id === service)?.name ?? service, clear: () => { setService(""); reset(); } });
  if (method) chips.push({ label: method.toUpperCase(), clear: () => { setMethod(""); reset(); } });
  if (who) chips.push({ label: `By ${who}`, clear: () => { setWho(""); reset(); } });
  if (amin) chips.push({ label: `From R${amin}`, clear: () => { setAmin(""); reset(); } });
  if (amax) chips.push({ label: `Up to R${amax}`, clear: () => { setAmax(""); reset(); } });
  if (r.active) chips.push({ label: r.label, clear: () => { r.clear(); reset(); } });
  const clearAll = () => {
    setQ(""); setStatus(""); setService(""); setMethod(""); setWho(""); setAmin(""); setAmax("");
    r.clear();
    reset();
  };

  const exportCsv = () => {
    const head = ["Ticket", "Dropped off", "Collected", "Customer", "Phone", "Service", "Quantity", "Amount (R)", "Status", "Payment", "Captured by"];
    const lines = rows.map((o) => {
      const sv = services.find((s) => s.id === o.service);
      return [
        o.id, dayLong(o.created), o.collectedAt ? dayLong(o.collectedAt) : "", o.name, showPhone(o.phone),
        sv?.name ?? o.service, `${o.qty} ${sv?.unit ?? ""}`, (o.cents / 100).toFixed(2), LABEL[o.status], o.method ?? "", o.by ?? "",
      ].map(safe).join(",");
    });
    const blob = new Blob(["\ufeff" + [head.map(safe).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${dkey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="card rec">
      <div className="filters">
        <label className="grow">
          Search
          <input value={q} onChange={on(setQ)} placeholder="Ticket, name or phone" />
        </label>
        <label>
          Status
          <select value={status} onChange={on(setStatus)}>
            <option value="">All statuses</option>
            <option value="open">Not collected yet</option>
            {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select>
        </label>
        <label>
          Service
          <select value={service} onChange={on(setService)}>
            <option value="">All services</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>
          Payment
          <select value={method} onChange={on(setMethod)}>
            <option value="">Any payment</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="eft">EFT</option>
          </select>
        </label>
        <label>
          Captured by
          <select value={who} onChange={on(setWho)}>
            <option value="">Anyone</option>
            {people.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <DateRangeField r={r} onChange={reset} />
        <label>
          Min amount (R)
          <input className="amt" value={amin} onChange={on(setAmin)} inputMode="decimal" />
        </label>
        <label>
          Max amount (R)
          <input className="amt" value={amax} onChange={on(setAmax)} inputMode="decimal" />
        </label>
      </div>

      <FilterChips chips={chips} onClearAll={clearAll} />

      <div className="sumline">
        <span>
          <b>{rows.length}</b> orders · {rand(value)} in total · {rand(paid)} paid · {rand(value - paid)} not yet paid
        </span>
        <button className="btn btn--sm" onClick={exportCsv} disabled={!rows.length}>
          Export {rows.length} to CSV
        </button>
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              {th("created", "Dropped off")}
              {th("customer", "Customer")}
              <th>Service</th>
              {th("amount", "Amount")}
              {th("status", "Status")}
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => {
              const sv = services.find((s) => s.id === o.service);
              return (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{dayLong(o.created)}</td>
                  <td>{o.name}<br /><small>{showPhone(o.phone)}</small></td>
                  <td>{sv?.name}<br /><small>{o.qty} {sv?.unit}</small></td>
                  <td>{rand(o.cents)}</td>
                  <td>{LABEL[o.status]}</td>
                  <td>{o.method ? o.method.toUpperCase() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shown.length && <p className="empty">No orders match these filters. <button className="link" onClick={clearAll}>Clear all</button></p>}
      </div>

      <Pager page={page} size={size} total={rows.length} onPage={setPage} onSize={(s) => { setSize(s); reset(); }} />
    </section>
  );
}
