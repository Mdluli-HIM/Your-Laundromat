"use client";
import { useMemo, useState } from "react";
import type { Order } from "@/lib/store";
import { busiest, byService, change, periods, series, topCustomers, type Mode } from "@/lib/reports";
import { rand } from "@/lib/format";
import { services } from "@/data/shop";
import BarChart from "@/components/owner/BarChart";

const MODES: [Mode, string][] = [["day", "Last 30 days"], ["week", "Last 12 weeks"], ["month", "Last 12 months"]];

export default function Overview({ all, live, now }: { all: Order[]; live: Order[]; now: Date }) {
  const [mode, setMode] = useState<Mode>("day");
  const per = useMemo(() => periods(all, now), [all, now]);
  const bars = useMemo(() => series(all, mode, now), [all, mode, now]);
  const data = useMemo(() => {
    const end = new Date(now.getTime() + 1);
    const m0 = new Date(now.getFullYear(), now.getMonth(), 1);
    const y0 = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const w8 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 56);
    return { mix: byService(all, m0, end), cust: topCustomers(all, y0, end), days: busiest(all, w8, end) };
  }, [all, now]);

  const total = bars.reduce((s, b) => s + b.cents, 0);
  const mixMax = Math.max(1, ...data.mix.map((m) => m.cents));
  const dayMax = Math.max(1, ...data.days.map((d) => d.count));
  const readyNow = live.filter((o) => o.status === "ready");
  const stuck = readyNow.filter((o) => now.getTime() - new Date(o.readyAt ?? o.created).getTime() > 86400000);
  const month = per[2];

  return (
    <div className="ov">
      <div className="ov__periods">
        {per.map((p) => {
          const c = change(p.cur.cents, p.prev.cents);
          return (
            <div key={p.key} className="card">
              <span className="label">{p.label}</span>
              <b className="ov__big">{rand(p.cur.cents)}</b>
              <small>{p.cur.count} orders collected</small>
              <small className={c === null ? "" : c >= 0 ? "up" : "down"}>
                {c === null ? `No data for ${p.prevLabel}` : `${c >= 0 ? "▲" : "▼"} ${Math.abs(c)}% vs ${p.prevLabel}`}
              </small>
            </div>
          );
        })}
      </div>

      <section className="card">
        <div className="ov__head">
          <h2>Income</h2>
          <div className="seg">
            {MODES.map(([m, l]) => (
              <button key={m} className={mode === m ? "is-on" : ""} onClick={() => setMode(m)}>{l}</button>
            ))}
          </div>
        </div>
        <p className="muted">
          {rand(total)} in this period · average {rand(Math.round(total / bars.length))} per {mode}
        </p>
        <BarChart bars={bars} />
      </section>

      <div className="ov__cols">
        <section className="card">
          <h2>Income by service, this month</h2>
          {data.mix.length === 0 && <p className="muted">Nothing collected yet this month.</p>}
          {data.mix.map((m) => (
            <div key={m.id} className="hbar">
              <span>{services.find((s) => s.id === m.id)?.name}</span>
              <i style={{ width: `${(m.cents / mixMax) * 100}%` }} />
              <b>{rand(m.cents)}</b>
            </div>
          ))}
          <p className="muted">Average order {month.cur.count ? rand(Math.round(month.cur.cents / month.cur.count)) : "—"}</p>
        </section>

        <section className={`card ${stuck.length ? "is-warn" : ""}`}>
          <h2>Laundry waiting to be collected</h2>
          <b className="ov__big">{rand(readyNow.reduce((s, o) => s + o.cents, 0))}</b>
          <p className="muted">{readyNow.length} orders are ready and unpaid.</p>
          <p className={stuck.length ? "down" : "muted"}>
            {stuck.length ? `${stuck.length} have been waiting over a day. Send reminders from the staff screen.` : "Nothing is overdue."}
          </p>
        </section>
      </div>

      <div className="ov__cols">
        <section className="card">
          <h2>Top customers, last 12 months</h2>
          {data.cust.top.map((c) => (
            <div key={c.name} className="rowline">
              <span>{c.name}</span>
              <span className="muted">{c.count} orders</span>
              <b>{rand(c.cents)}</b>
            </div>
          ))}
          <p className="muted">{data.cust.repeat}% of {data.cust.customers} customers came back more than once.</p>
        </section>

        <section className="card">
          <h2>Busiest days, last 8 weeks</h2>
          {data.days.map((d) => (
            <div key={d.label} className="hbar">
              <span>{d.label}</span>
              <i style={{ width: `${(d.count / dayMax) * 100}%` }} />
              <b>{d.count}</b>
            </div>
          ))}
          <p className="muted">Orders dropped off per weekday. Useful for planning staff.</p>
        </section>
      </div>
    </div>
  );
}
