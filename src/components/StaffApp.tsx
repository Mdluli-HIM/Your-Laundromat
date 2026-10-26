"use client";
import { useState } from "react";
import { useDemo } from "@/lib/useDemo";
import { advance, collect, remind, type Order } from "@/lib/store";
import { LABEL, nextStatus, type Status } from "@/lib/status";
import { rand, ago } from "@/lib/format";
import { showPhone } from "@/lib/phone";
import { services } from "@/data/shop";
import NewOrder from "@/components/NewOrder";

const COLS: Status[] = ["received", "washing", "drying", "folding", "ready"];
const ACTION: Record<string, string> = {
  received: "Start washing",
  washing: "Move to dryer",
  drying: "Move to folding",
  folding: "Mark ready",
};
const sameDay = (iso?: string) => !!iso && new Date(iso).toDateString() === new Date().toDateString();

export default function StaffApp({ compact = false }: { compact?: boolean }) {
  const { orders, now, ready } = useDemo();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");

  const digits = q.replace(/\D/g, "");
  const match = (o: Order) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return o.id.toLowerCase().includes(s) || o.name.toLowerCase().includes(s) || (digits.length > 0 && (o.phone.replace(/\D/g, "").includes(digits) || ("0" + o.phone.replace(/\D/g, "").slice(2)).includes(digits)));
  };

  const readyNow = orders.filter((o) => o.status === "ready");
  const waiting = readyNow.filter((o) => now - new Date(o.readyAt ?? o.created).getTime() > 86400000);
  const inProgress = orders.filter((o) => o.status !== "collected" && o.status !== "ready").length;
  const takings = orders.filter((o) => o.paid && sameDay(o.collectedAt)).reduce((s, o) => s + o.cents, 0);
  const todayCount = orders.filter((o) => sameDay(o.created)).length;
  const collected = orders.filter((o) => o.status === "collected" && match(o));

  if (!ready) return <p className="muted">Loading…</p>;

  return (
    <div className={`staff ${compact ? "is-compact" : ""}`}>
      <div className="sum">
        <div><b>{todayCount}</b><span>Orders today</span></div>
        <div><b>{inProgress}</b><span>In progress</span></div>
        <div><b>{readyNow.length}</b><span>Ready</span></div>
        <div className={waiting.length ? "is-warn" : ""}><b>{waiting.length}</b><span>Waiting over a day</span></div>
        <div><b>{rand(takings)}</b><span>Takings today</span></div>
      </div>

      <div className="tools">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ticket, name or phone" aria-label="Search orders" />
        <button className="btn" onClick={() => setOpen(true)}>+ New order</button>
      </div>

      {flash && <p className="flash" role="status">{flash}</p>}
      {open && (
        <NewOrder
          onClose={() => setOpen(false)}
          onCreated={(o) => {
            setFlash(`Order ${o.id} created${o.consent ? ". SMS sent to the customer." : "."}`);
            window.setTimeout(() => setFlash(""), 4500);
          }}
        />
      )}

      <div className="board">
        {COLS.map((c) => {
          const list = orders.filter((o) => o.status === c && match(o)).sort((a, b) => a.created.localeCompare(b.created));
          return (
            <section key={c} className="col" data-status={c}>
              <h3>
                <span className="col__name">{LABEL[c]}</span>
                <span className="col__count">{list.length}</span>
              </h3>
              <div className="col__list">
                {list.length === 0 && <p className="col__empty">Nothing here</p>}
                {list.map((o) => {
                  const n = nextStatus(o.status);
                  const sv = services.find((s) => s.id === o.service);
                  const waited = now - new Date(o.readyAt ?? o.created).getTime();
                  const late = c === "ready" && waited > 86400000;
                  return (
                    <article key={o.id} className={`ocard ${late ? "is-late" : ""}`}>
                      <header>
                        <strong>{o.id}</strong>
                        <span>{ago(o.created, now)}</span>
                      </header>
                      <p className="ocard__who">{o.name}</p>
                      <div className="ocard__line">
                        <span>{sv?.name}</span>
                        <b>{rand(o.cents)}</b>
                      </div>
                      <small>
                        {o.qty} {sv?.unit === "kg" ? "kg" : "items"} · {showPhone(o.phone)}
                      </small>
                      {o.note && <small className="ocard__note">{o.note}</small>}
                      {late && <small className="ocard__late">Waiting {ago(o.readyAt ?? o.created, now).replace(" ago", "")}</small>}
                      {c !== "ready" && n && (
                        <button className="btn btn--sm btn--block" onClick={() => advance(o.id)}>
                          {ACTION[c]} →
                        </button>
                      )}
                      {c === "ready" && (
                        <div className="ocard__act">
                          <button className="btn btn--sm btn--block" onClick={() => collect(o.id)}>
                            Collected and paid
                          </button>
                          <button className="link" onClick={() => remind(o.id)}>
                            Send reminder
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {collected.length > 0 && (
        <details className="done">
          <summary>Collected ({collected.length})</summary>
          {collected.map((o) => (
            <p key={o.id}>{o.id} · {o.name} · {rand(o.cents)} · paid</p>
          ))}
        </details>
      )}
    </div>
  );
}
