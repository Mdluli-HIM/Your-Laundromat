"use client";
import { useMemo, useState } from "react";
import { CATEGORIES, type Expense } from "@/lib/store";
import { inKey } from "@/lib/filters";
import { parseKey } from "@/lib/reports";
import { slicePage } from "@/lib/paging";
import { rand } from "@/lib/format";
import { useDateRange } from "@/lib/useDateRange";
import Pager from "@/components/owner/Pager";
import FilterChips, { type Chip } from "@/components/owner/FilterChips";
import DateRangeField from "@/components/owner/DateRangeField";

export default function ExpenseList({ expenses, now }: { expenses: Expense[]; now: Date }) {
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const r = useDateRange(now);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const reset = () => setPage(0);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return expenses
      .filter((e) => inKey(e.date, r.from, r.to) && (!cat || e.category === cat) && (!s || `${e.note} ${e.category} ${e.by}`.toLowerCase().includes(s)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, cat, q, r.from, r.to]);
  const total = rows.reduce((s, e) => s + e.cents, 0);
  const breakdown = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.cents));
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const shown = slicePage(rows, page, size);

  const chips: Chip[] = [];
  if (q.trim()) chips.push({ label: `Search: ${q.trim()}`, clear: () => { setQ(""); reset(); } });
  if (cat) chips.push({ label: cat, clear: () => { setCat(""); reset(); } });
  if (r.active) chips.push({ label: r.label, clear: () => { r.clear(); reset(); } });
  const clearAll = () => { setQ(""); setCat(""); r.clear(); reset(); };

  return (
    <div className="rec">
      <h3>All expenses</h3>
      <div className="filters">
        <label className="grow">
          Search
          <input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Note or category" />
        </label>
        <label>
          Category
          <select value={cat} onChange={(e) => { setCat(e.target.value); reset(); }}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <DateRangeField r={r} onChange={reset} />
      </div>
      <FilterChips chips={chips} onClearAll={clearAll} />
      <div className="sumline"><span><b>{rows.length}</b> expenses · {rand(total)}</span></div>
      {breakdown.length > 1 && (
        <p className="muted">By category: {breakdown.map(([c, v]) => `${c} ${rand(v)}`).join(" · ")}</p>
      )}

      <div className="tablewrap">
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Note</th><th>By</th><th>Amount</th></tr></thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.id}>
                <td>{parseKey(x.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td>{x.category}</td>
                <td>{x.note || "—"}</td>
                <td>{x.by}</td>
                <td>{rand(x.cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="empty">No expenses match. <button className="link" onClick={clearAll}>Clear all</button></p>}
      </div>

      <Pager page={page} size={size} total={rows.length} onPage={setPage} onSize={(s) => { setSize(s); reset(); }} />
    </div>
  );
}
