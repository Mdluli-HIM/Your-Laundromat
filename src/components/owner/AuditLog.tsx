"use client";
import { useMemo, useState } from "react";
import { inIso } from "@/lib/filters";
import { slicePage } from "@/lib/paging";
import { useDateRange } from "@/lib/useDateRange";
import type { Audit } from "@/lib/store";
import Pager from "@/components/owner/Pager";
import FilterChips, { type Chip } from "@/components/owner/FilterChips";
import DateRangeField from "@/components/owner/DateRangeField";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AuditLog({ audit, now }: { audit: Audit[]; now: Date }) {
  const [q, setQ] = useState("");
  const [who, setWho] = useState("");
  const [action, setAction] = useState("");
  const r = useDateRange(now);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const reset = () => setPage(0);
  const on = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    set(e.target.value);
    reset();
  };

  const people = useMemo(() => [...new Set(audit.map((a) => a.who))].sort(), [audit]);
  const actions = useMemo(() => [...new Set(audit.map((a) => a.action))].sort(), [audit]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return audit.filter(
      (a) =>
        (!who || a.who === who) &&
        (!action || a.action === action) &&
        inIso(a.at, r.from, r.to) &&
        (!s || `${a.action} ${a.ticket ?? ""} ${a.detail ?? ""}`.toLowerCase().includes(s))
    );
  }, [audit, q, who, action, r.from, r.to]);
  const shown = slicePage(rows, page, size);

  const chips: Chip[] = [];
  if (q.trim()) chips.push({ label: `Search: ${q.trim()}`, clear: () => { setQ(""); reset(); } });
  if (who) chips.push({ label: who, clear: () => { setWho(""); reset(); } });
  if (action) chips.push({ label: action, clear: () => { setAction(""); reset(); } });
  if (r.active) chips.push({ label: r.label, clear: () => { r.clear(); reset(); } });
  const clearAll = () => { setQ(""); setWho(""); setAction(""); r.clear(); reset(); };

  return (
    <section className="card rec">
      <p className="muted">Every action is recorded with who did it and when. Entries cannot be edited or deleted.</p>
      <div className="filters">
        <label className="grow">
          Search
          <input value={q} onChange={on(setQ)} placeholder="Action, ticket or detail" />
        </label>
        <label>
          Person
          <select value={who} onChange={on(setWho)}>
            <option value="">Everyone</option>
            {people.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>
          Action
          <select value={action} onChange={on(setAction)}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <DateRangeField r={r} onChange={reset} />
      </div>

      <FilterChips chips={chips} onClearAll={clearAll} />
      <p className="sumline"><span><b>{rows.length}</b> entries</span></p>

      <div className="tablewrap">
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Ticket</th><th>Detail</th></tr></thead>
          <tbody>
            {shown.map((a) => (
              <tr key={a.id}>
                <td>{when(a.at)}</td>
                <td>{a.who}</td>
                <td>{a.action}</td>
                <td>{a.ticket ?? "—"}</td>
                <td>{a.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="empty">Nothing matches. <button className="link" onClick={clearAll}>Clear all</button></p>}
      </div>

      <Pager page={page} size={size} total={rows.length} onPage={setPage} onSize={(s) => { setSize(s); reset(); }} />
    </section>
  );
}
