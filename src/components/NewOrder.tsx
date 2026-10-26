"use client";
import { useEffect, useState } from "react";
import { services } from "@/data/shop";
import { createOrder, type Order } from "@/lib/store";
import { normalizePhone } from "@/lib/phone";
import { rand } from "@/lib/format";
import { useDemo } from "@/lib/useDemo";

export default function NewOrder({ onCreated, onClose }: { onCreated: (o: Order) => void; onClose: () => void }) {
  const { orders } = useDemo();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [service, setService] = useState(services[0].id);
  const [qty, setQty] = useState("3");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(true);
  const [err, setErr] = useState("");

  const sv = services.find((s) => s.id === service)!;
  const q = parseFloat(qty.replace(",", "."));
  const cents = Number.isFinite(q) && q > 0 ? Math.round(sv.cents * q) : 0;
  const norm = normalizePhone(phone);

  /* a returning customer is recognised by their number */
  useEffect(() => {
    if (!norm || name) return;
    const known = orders.find((o) => o.phone === norm);
    if (known) setName(known.name);
  }, [norm, name, orders]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!norm) return setErr("Enter a valid South African number, like 082 123 4567.");
    if (name.trim().length < 2) return setErr("Enter the customer's name.");
    if (!(q > 0)) return setErr("Enter the weight or the number of items.");
    onCreated(createOrder({ name: name.trim(), phone: norm, service, qty: q, note: note.trim(), consent }));
    onClose();
  };

  return (
    <form className="neworder card" onSubmit={submit} noValidate>
      <h3>New order</h3>
      <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="082 123 4567" autoFocus /></label>
      <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" /></label>
      <label>Service
        <select value={service} onChange={(e) => setService(e.target.value)}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({rand(s.cents)} per {s.unit})</option>)}
        </select>
      </label>
      <label>{sv.unit === "kg" ? "Weight (kg)" : "Number of items"}<input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" /></label>
      <label>Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. stain on the white shirt" /></label>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Customer agreed to SMS updates about this order</span>
      </label>
      <p className="neworder__total">Total {cents ? rand(cents) : "—"}</p>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">
        <button className="btn" type="submit">Create order and send SMS</button>
        <button className="btn btn--ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
