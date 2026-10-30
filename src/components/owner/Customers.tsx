"use client";
import { useMemo, useState } from "react";
import { buildCustomers, bdayLabel, STATUS_HINT, STATUS_LABEL, type CStatus } from "@/lib/customers";
import { sendWinback, type Order, type Profile, type Voucher } from "@/lib/store";
import { rand, dayLong } from "@/lib/format";
import { showPhone } from "@/lib/phone";
import { slicePage } from "@/lib/paging";
import { dkey } from "@/lib/reports";
import Pager from "@/components/owner/Pager";
import FilterChips, { type Chip } from "@/components/owner/FilterChips";
import CustomerPanel from "@/components/owner/CustomerPanel";

type SortKey = "name" | "last" | "first" | "visits" | "spent";
const ORDER: CStatus[] = ["new", "active", "atrisk", "lapsed"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const safe = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; /* stops spreadsheet formulas in exported text */
  return `"${s.replace(/"/g, '""')}"`;
};

type Props = { all: Order[]; profiles: Record<string, Profile>; vouchers: Voucher[]; now: Date };

export default function Customers({ all, profiles, vouchers, now }: Props) {
  const t = now.getTime();
  const list = useMemo(() => buildCustomers(all, profiles, vouchers, t), [all, profiles, vouchers, t]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | CStatus>("");
  const [away, setAway] = useState("");
  const [month, setMonth] = useState("");
  const [hasV, setHasV] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "last", dir: -1 });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState("");
  const [flash, setFlash] = useState("");
  const reset = () => setPage(0);

  const counts = useMemo(() => {
    const c = { new: 0, active: 0, atrisk: 0, lapsed: 0 };
    list.forEach((x) => c[x.status]++);
    return c;
  }, [list]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const min = parseInt(away, 10);
    const out = list.filter((c) => {
      if (status && c.status !== status) return false;
      if (min > 0 && c.days < min) return false;
      if (month && (!c.birthday || parseInt(c.birthday.split("-")[0], 10) !== parseInt(month, 10))) return false;
      if (hasV && c.vouchers === 0) return false;
      if (!s) return true;
      const p = c.phone.replace(/\D/g, "");
      return c.name.toLowerCase().includes(s) || (digits.length > 0 && (p.includes(digits) || ("0" + p.slice(2)).includes(digits)));
    });
    out.sort((a, b) => {
      let c = 0;
      if (sort.key === "name") c = a.name.localeCompare(b.name);
      else if (sort.key === "last") c = a.last.localeCompare(b.last);
      else if (sort.key === "first") c = a.first.localeCompare(b.first);
      else if (sort.key === "visits") c = a.visits - b.visits;
      else c = a.spent - b.spent;
      return c * sort.dir || a.name.localeCompare(b.name);
    });
    return out;
  }, [list, q, status, away, month, hasV, sort]);

  const shown = slicePage(rows, page, size);
  const targets = rows.filter((c) => (c.status === "atrisk" || c.status === "lapsed") && c.consent);
  const selected = list.find((c) => c.phone === open);

  const toggle = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "name" ? 1 : -1 }));
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
  if (status) chips.push({ label: STATUS_LABEL[status], clear: () => { setStatus(""); reset(); } });
  if (away) chips.push({ label: `Away ${away}+ days`, clear: () => { setAway(""); reset(); } });
  if (month) chips.push({ label: `Birthday in ${MONTHS[parseInt(month, 10) - 1]}`, clear: () => { setMonth(""); reset(); } });
  if (hasV) chips.push({ label: "Has a voucher", clear: () => { setHasV(false); reset(); } });
  const clearAll = () => { setQ(""); setStatus(""); setAway(""); setMonth(""); setHasV(false); reset(); };

  const bulk = () => {
    if (!window.confirm(`Send a win-back voucher by SMS to ${targets.length} customers?`)) return;
    let sent = 0;
    let skipped = 0;
    targets.forEach((c) => (sendWinback(c.phone, c.name) ? sent++ : skipped++));
    setFlash(`Sent ${sent} win-back offers.${skipped ? ` ${skipped} skipped, they already got one in the last 30 days.` : ""}`);
    window.setTimeout(() => setFlash(""), 7000);
  };

  const exportCsv = () => {
    const head = ["Name", "Phone", "Status", "First visit", "Last visit", "Days since last visit", "Visits", "Total spent (R)", "Birthday", "SMS offers"];
    const lines = rows.map((c) =>
      [c.name, showPhone(c.phone), STATUS_LABEL[c.status], dayLong(c.first), dayLong(c.last), c.days, c.visits, (c.spent / 100).toFixed(2), bdayLabel(c.birthday), c.consent ? "Agreed" : "Not agreed"]
        .map(safe).join(",")
    );
    const blob = new Blob(["\ufeff" + [head.map(safe).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${dkey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cust">
      <div className="cstats">
        <button className={`cstat ${status === "" ? "is-on" : ""}`} data-s="all" onClick={() => { setStatus(""); reset(); }}>
          <b>{list.length}</b><span>All customers</span><small>Everyone who has visited</small>
        </button>
        {ORDER.map((s) => (
          <button key={s} className={`cstat ${status === s ? "is-on" : ""}`} data-s={s} onClick={() => { setStatus(status === s ? "" : s); reset(); }}>
            <b>{counts[s]}</b><span>{STATUS_LABEL[s]}</span><small>{STATUS_HINT[s]}</small>
          </button>
        ))}
      </div>

      <section className="card rec">
        <div className="filters">
          <label className="grow">
            Search
            <input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Name or phone" />
          </label>
          <label>
            Not seen for at least
            <span className="withunit">
              <input className="amt" value={away} onChange={(e) => { setAway(e.target.value); reset(); }} inputMode="numeric" placeholder="60" />
              <i>days</i>
            </span>
          </label>
          <label>
            Birthday month
            <select value={month} onChange={(e) => { setMonth(e.target.value); reset(); }}>
              <option value="">Any month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
          </label>
          <label className="checkline">
            <input type="checkbox" checked={hasV} onChange={(e) => { setHasV(e.target.checked); reset(); }} />
            Has a voucher
          </label>
        </div>

        <FilterChips chips={chips} onClearAll={clearAll} />
        {flash && <p className="flash" role="status">{flash}</p>}

        <div className="sumline">
          <span><b>{rows.length}</b> customers</span>
          <span className="row">
            {targets.length > 0 && (
              <button className="btn btn--sm" onClick={bulk}>Send win-back offer to {targets.length}</button>
            )}
            <button className="btn btn--ghost btn--sm" onClick={exportCsv} disabled={!rows.length}>Export {rows.length} to CSV</button>
          </span>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                {th("name", "Customer")}
                <th>Status</th>
                {th("first", "First visit")}
                {th("last", "Last visit")}
                {th("visits", "Visits")}
                {th("spent", "Spent")}
                <th>Vouchers</th>
                <th>Birthday</th>
                <th><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.phone} className="is-click" onClick={() => setOpen(c.phone)}>
                  <td>{c.name}<br /><small>{showPhone(c.phone)}</small></td>
                  <td><span className={`pill pill--${c.status}`} title={STATUS_HINT[c.status]}>{STATUS_LABEL[c.status]}</span></td>
                  <td>{dayLong(c.first)}</td>
                  <td>{dayLong(c.last)}<br /><small>{c.days === 0 ? "today" : `${c.days} days ago`}</small></td>
                  <td>{c.visits}</td>
                  <td>{rand(c.spent)}</td>
                  <td>{c.vouchers || "—"}</td>
                  <td>{bdayLabel(c.birthday)}</td>
                  <td><button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); setOpen(c.phone); }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="empty">No customers match. <button className="link" onClick={clearAll}>Clear all</button></p>}
        </div>

        <Pager page={page} size={size} total={rows.length} onPage={setPage} onSize={(s) => { setSize(s); reset(); }} />
      </section>

      {selected && (
        <CustomerPanel
          c={selected}
          orders={all.filter((o) => o.phone === selected.phone)}
          vouchers={vouchers.filter((v) => v.phone === selected.phone)}
          profile={profiles[selected.phone]}
          now={t}
          onClose={() => setOpen("")}
        />
      )}
    </div>
  );
}
