"use client";
import { useEffect, useState } from "react";
import { REASON_LABEL, STATUS_HINT, STATUS_LABEL, bdayLabel, type Customer } from "@/lib/customers";
import {
  giveVoucher, sendWinback, setProfile, voucherLabel, voucherStatus,
  type Order, type Profile, type Voucher,
} from "@/lib/store";
import { LABEL } from "@/lib/status";
import { rand, dayLong } from "@/lib/format";
import { showPhone } from "@/lib/phone";
import { services } from "@/data/shop";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");

type Props = {
  c: Customer;
  orders: Order[];
  vouchers: Voucher[];
  profile?: Profile;
  now: number;
  onClose: () => void;
};

export default function CustomerPanel({ c, orders, vouchers, profile, now, onClose }: Props) {
  const [bm, setBm] = useState(c.birthday ? String(parseInt(c.birthday.split("-")[0], 10)) : "");
  const [bd, setBd] = useState(c.birthday ? String(parseInt(c.birthday.split("-")[1], 10)) : "");
  const [kind, setKind] = useState<"rand" | "percent">("rand");
  const [val, setVal] = useState("50");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const mine = [...vouchers].sort((a, b) => b.issued.localeCompare(a.issued));
  const recent = [...orders].sort((a, b) => b.created.localeCompare(a.created)).slice(0, 8);
  const avg = c.visits ? Math.round(c.spent / c.visits) : 0;
  const away = c.status === "atrisk" || c.status === "lapsed";

  const saveBirthday = () => {
    if (!bm && !bd) {
      setProfile(c.phone, { name: c.name, birthday: undefined, consent: profile ? profile.consent : true });
      return setMsg("Birthday removed.");
    }
    const m = parseInt(bm, 10);
    const d = parseInt(bd, 10);
    if (!m || !d || new Date(2000, m - 1, d).getMonth() !== m - 1) return setMsg("Choose a month and a valid day.");
    setProfile(c.phone, { name: c.name, birthday: `${p2(m)}-${p2(d)}`, consent: profile ? profile.consent : true });
    setMsg("Birthday saved.");
  };

  const give = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(val.replace(",", "."));
    if (!(n > 0) || (kind === "percent" && n > 100)) return setMsg("Enter a valid amount.");
    const v = giveVoucher(c.phone, c.name, kind, kind === "rand" ? Math.round(n * 100) : Math.round(n));
    setMsg(`Voucher ${v.code} created${v.sms ? " and sent by SMS." : ". This customer has not agreed to SMS, so tell them in person."}`);
  };

  const winback = () => {
    const v = sendWinback(c.phone, c.name);
    setMsg(v ? `Win-back voucher ${v.code} created${v.sms ? " and sent by SMS." : ". No SMS consent."}` : "A win-back offer was already sent in the last 30 days.");
  };

  return (
    <>
      <button className="scrim" aria-label="Close" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Customer ${c.name}`}>
        <div className="drawer__head">
          <div>
            <h2>{c.name}</h2>
            <p className="muted">{showPhone(c.phone)}</p>
            <span className={`pill pill--${c.status}`} title={STATUS_HINT[c.status]}>{STATUS_LABEL[c.status]}</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
        </div>

        <dl className="facts2">
          <div><dt>First visit</dt><dd>{dayLong(c.first)}</dd></div>
          <div><dt>Last visit</dt><dd>{dayLong(c.last)}<br /><small>{c.days === 0 ? "today" : `${c.days} days ago`}</small></dd></div>
          <div><dt>Visits</dt><dd>{c.visits}</dd></div>
          <div><dt>Total spent</dt><dd>{rand(c.spent)}</dd></div>
          <div><dt>Average order</dt><dd>{rand(avg)}</dd></div>
          <div><dt>Birthday</dt><dd>{bdayLabel(c.birthday)}</dd></div>
          <div><dt>SMS offers</dt><dd>{c.consent ? "Agreed" : "Not agreed"}</dd></div>
        </dl>

        {msg && <p className="flash" role="status">{msg}</p>}

        <section className="card">
          <h3>Actions</h3>
          {away && <button className="btn btn--sm" onClick={winback} disabled={!c.consent}>Send a win-back offer by SMS</button>}
          {away && !c.consent && <p className="muted">This customer has not agreed to SMS offers.</p>}
          <form className="inline-form" onSubmit={give}>
            <label>Give a voucher
              <select value={kind} onChange={(e) => setKind(e.target.value as "rand" | "percent")}>
                <option value="rand">Rand off</option>
                <option value="percent">Percent off</option>
              </select>
            </label>
            <label>{kind === "rand" ? "Amount (R)" : "Percent"}
              <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" className="amt" />
            </label>
            <button className="btn btn--sm" type="submit">Create and text it</button>
          </form>
          <div className="inline-form">
            <label>Birthday
              <span className="bday__row">
                <select value={bm} onChange={(e) => setBm(e.target.value)}>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                </select>
                <select value={bd} onChange={(e) => setBd(e.target.value)}>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
                </select>
              </span>
            </label>
            <button className="btn btn--ghost btn--sm" onClick={saveBirthday}>Save birthday</button>
          </div>
        </section>

        <section className="card">
          <h3>Vouchers ({mine.length})</h3>
          <div className="tablewrap short">
            <table>
              <thead><tr><th>Code</th><th>Offer</th><th>Why</th><th>Issued</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {mine.map((v) => {
                  const st = voucherStatus(v, now);
                  return (
                    <tr key={v.code}>
                      <td>{v.code}</td>
                      <td>{voucherLabel(v)}</td>
                      <td>{REASON_LABEL[v.reason]}</td>
                      <td>{dayLong(v.issued)}</td>
                      <td>{dayLong(v.expires)}</td>
                      <td><span className={`vs vs--${st}`}>{st}</span></td>
                    </tr>
                  );
                })}
                {!mine.length && <tr><td colSpan={6} className="muted">No vouchers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Recent orders</h3>
          <div className="tablewrap short">
            <table>
              <thead><tr><th>Ticket</th><th>Date</th><th>Service</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{dayLong(o.created)}</td>
                    <td>{services.find((s) => s.id === o.service)?.name}</td>
                    <td>{rand(o.cents)}</td>
                    <td>{LABEL[o.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </aside>
    </>
  );
}
