"use client";
import { useMemo, useState } from "react";
import type { Cashup } from "@/lib/store";
import { inKey } from "@/lib/filters";
import { parseKey } from "@/lib/reports";
import { slicePage } from "@/lib/paging";
import { rand } from "@/lib/format";
import { useDateRange } from "@/lib/useDateRange";
import Pager from "@/components/owner/Pager";
import FilterChips, { type Chip } from "@/components/owner/FilterChips";
import DateRangeField from "@/components/owner/DateRangeField";

const RESULTS = [["balanced", "Balanced"], ["short", "Short"], ["over", "Over"]] as const;

export default function CashupHistory({ cashups, now }: { cashups: Cashup[]; now: Date }) {
  const [result, setResult] = useState("");
  const r = useDateRange(now);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const reset = () => setPage(0);

  const rows = useMemo(
    () =>
      cashups
        .filter((c) => {
          const d = c.counted - c.expected;
          if (!inKey(c.date, r.from, r.to)) return false;
          if (result === "balanced") return d === 0;
          if (result === "short") return d < 0;
          if (result === "over") return d > 0;
          return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [cashups, result, r.from, r.to]
  );
  const net = rows.reduce((s, c) => s + (c.counted - c.expected), 0);
  const off = rows.filter((c) => c.counted !== c.expected).length;
  const shown = slicePage(rows, page, size);

  const chips: Chip[] = [];
  if (result) chips.push({ label: RESULTS.find((x) => x[0] === result)?.[1] ?? result, clear: () => { setResult(""); reset(); } });
  if (r.active) chips.push({ label: r.label, clear: () => { r.clear(); reset(); } });
  const clearAll = () => { setResult(""); r.clear(); reset(); };

  return (
    <section className="card rec">
      <h2>Past cash-ups</h2>
      <div className="filters">
        <label>
          Result
          <select value={result} onChange={(e) => { setResult(e.target.value); reset(); }}>
            <option value="">All results</option>
            {RESULTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </label>
        <DateRangeField r={r} onChange={reset} />
      </div>
      <FilterChips chips={chips} onClearAll={clearAll} />
      <div className="sumline">
        <span>
          <b>{rows.length}</b> cash-ups · {off} not balanced · net difference{" "}
          <b className={net === 0 ? "up" : "down"}>{net === 0 ? "none" : rand(net)}</b>
        </span>
      </div>

      <div className="tablewrap">
        <table>
          <thead><tr><th>Date</th><th>Expected</th><th>Counted</th><th>Difference</th><th>By</th></tr></thead>
          <tbody>
            {shown.map((c) => {
              const d = c.counted - c.expected;
              return (
                <tr key={c.date + c.at}>
                  <td>{parseKey(c.date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}</td>
                  <td>{rand(c.expected)}</td>
                  <td>{rand(c.counted)}</td>
                  <td className={d === 0 ? "up" : "down"}>{d === 0 ? "Balanced" : rand(d)}</td>
                  <td>{c.by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!shown.length && <p className="empty">No cash-ups match. <button className="link" onClick={clearAll}>Clear all</button></p>}
      </div>

      <Pager page={page} size={size} total={rows.length} onPage={setPage} onSize={(s) => { setSize(s); reset(); }} />
    </section>
  );
}
