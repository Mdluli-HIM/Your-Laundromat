"use client";
import { useEffect, useMemo, useState } from "react";
import { services } from "@/data/shop";
import { createOrder, discountFor, voucherLabel, voucherStatus, type Order } from "@/lib/store";
import { normalizePhone } from "@/lib/phone";
import { rand, dayLong } from "@/lib/format";
import { useDemo } from "@/lib/useDemo";
import { bdayLabel } from "@/lib/customers";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");

export default function NewOrder({ onCreated, onClose }: { onCreated: (o: Order) => void; onClose: () => void }) {
  const { all, vouchers, profiles, now } = useDemo();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [bm, setBm] = useState("");
  const [bd, setBd] = useState("");
  const [service, setService] = useState(services[0].id);
  const [qty, setQty] = useState("3");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(true);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const sv = services.find((s) => s.id === service)!;
  const q = parseFloat(qty.replace(",", "."));
  const gross = Number.isFinite(q) && q > 0 ? Math.round(sv.cents * q) : 0;
  const norm = normalizePhone(phone);

  /* a returning customer is recognised by their number */
  const known = useMemo(() => {
    if (!norm) return null;
    const mine = all.filter((o) => o.phone === norm);
    if (!mine.length) return null;
    const last = mine.reduce((a, b) => (a.created > b.created ? a : b));
    return { name: last.name, visits: mine.length, last: last.created };
  }, [all, norm]);
  useEffect(() => {
    if (known && !name) setName(known.name);
  }, [known, name]);

  const onFile = norm ? profiles[norm]?.birthday : undefined;
  const mine = useMemo(
    () => (norm ? vouchers.filter((v) => v.phone === norm && voucherStatus(v, now || 0) === "active") : []),
    [vouchers, norm, now]
  );
  const sel = mine.find((v) => v.code === code);
  const discount = sel ? discountFor(sel, gross) : 0;
  const total = gross - discount;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!norm) return setErr("Enter a valid South African number, like 082 123 4567.");
    if (name.trim().length < 2) return setErr("Enter the customer's name.");
    if (!(q > 0)) return setErr("Enter the weight or the number of items.");
    let birthday: string | undefined;
    if (bm || bd) {
      const m = parseInt(bm, 10);
      const d = parseInt(bd, 10);
      if (!m || !d || new Date(2000, m - 1, d).getMonth() !== m - 1) return setErr("Check the birthday: choose a month and a valid day.");
      birthday = `${p2(m)}-${p2(d)}`;
    }
    onCreated(createOrder({ name: name.trim(), phone: norm, service, qty: q, note: note.trim(), consent, birthday, voucher: sel?.code }));
    onClose();
  };

  return (
    <form className="neworder card" onSubmit={submit} noValidate>
      <h3>New order</h3>
      <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="082 123 4567" autoFocus /></label>
      {known && (
        <p className="hint">
          Returning customer: {known.visits} {known.visits === 1 ? "visit" : "visits"}, last on {dayLong(known.last)}.
        </p>
      )}
      <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" /></label>

      <div className="bday">
        <label>
          Birthday (optional, for the birthday voucher)
          <span className="bday__row">
            <select value={bm} onChange={(e) => setBm(e.target.value)} aria-label="Birthday month">
              <option value="">{onFile ? `On file: ${bdayLabel(onFile)}` : "Month"}</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
            <select value={bd} onChange={(e) => setBd(e.target.value)} aria-label="Birthday day">
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
            </select>
          </span>
        </label>
      </div>

      <label>Service
        <select value={service} onChange={(e) => setService(e.target.value)}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({rand(s.cents)} per {s.unit})</option>)}
        </select>
      </label>
      <label>{sv.unit === "kg" ? "Weight (kg)" : "Number of items"}<input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" /></label>
      <label>Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. stain on the white shirt" /></label>

      {mine.length > 0 && (
        <label className="voucher">
          This customer has a voucher
          <select value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">Do not use a voucher</option>
            {mine.map((v) => (
              <option key={v.code} value={v.code}>{v.code} · {voucherLabel(v)} · expires {dayLong(v.expires)}</option>
            ))}
          </select>
        </label>
      )}

      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Customer agreed to SMS updates and offers</span>
      </label>
      <p className="neworder__total">
        Total {gross ? rand(total) : "—"}
        {discount > 0 && <small> (voucher takes off {rand(discount)})</small>}
      </p>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row">
        <button className="btn" type="submit">Create order and send SMS</button>
        <button className="btn btn--ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
