"use client";
import { useDemo } from "@/lib/useDemo";
import { STATUSES, LABEL, COPY } from "@/lib/status";
import { rand, ago } from "@/lib/format";
import { services, shop as info } from "@/data/shop";

export default function TrackView({ ticket }: { ticket: string }) {
  const { orders, shop, ready, now } = useDemo();
  if (!ready) return <p className="muted">Loading…</p>;
  const o = orders.find((x) => x.id === ticket.trim().toUpperCase());
  if (!o)
    return (
      <div className="tv">
        <h2>Order not found</h2>
        <p>Check the ticket number on your slip.</p>
      </div>
    );
  const idx = STATUSES.indexOf(o.status);
  const sv = services.find((s) => s.id === o.service);
  return (
    <div className="tv">
      <p className="tv__shop">{shop}</p>
      <h2>Order {o.id}</h2>
      <p className="muted">Hi {o.name.split(" ")[0]}</p>
      <p className={`tv__now is-${o.status}`}>{LABEL[o.status]}</p>
      <p>{COPY[o.status]}</p>
      <ol className="tv__steps">
        {STATUSES.map((s, i) => (
          <li key={s} className={i < idx ? "is-done" : i === idx ? "is-now" : ""}>
            <i />
            <span>{LABEL[s]}</span>
          </li>
        ))}
      </ol>
      <dl className="tv__facts">
        <div><dt>Items</dt><dd>{sv?.name}, {o.qty} {sv?.unit === "kg" ? "kg" : o.qty === 1 ? "item" : "items"}</dd></div>
        <div><dt>{o.paid ? "Payment" : "Amount due"}</dt><dd>{o.paid ? "Paid" : rand(o.cents)}</dd></div>
        <div><dt>Dropped off</dt><dd>{ago(o.created, now)}</dd></div>
        <div><dt>Open</dt><dd>{info.hours}</dd></div>
        <div><dt>Questions</dt><dd>{info.phone}</dd></div>
      </dl>
    </div>
  );
}
