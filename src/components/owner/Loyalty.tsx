"use client";
import { useEffect, useMemo, useState } from "react";
import {
  runBirthdayCheck, saveLoyalty, voucherLabel, voucherStatus, voucherText,
  type Loyalty as LoyaltyT, type Profile, type Voucher, type VStatus,
} from "@/lib/store";
import { REASON_LABEL, bdayLabel, nextBirthday } from "@/lib/customers";
import { rand, dayLong } from "@/lib/format";
import { showPhone } from "@/lib/phone";
import { inIso } from "@/lib/filters";
import { slicePage } from "@/lib/paging";
import { useDateRange } from "@/lib/useDateRange";
import Pager from "@/components/owner/Pager";
import FilterChips, { type Chip } from "@/components/owner/FilterChips";
import DateRangeField from "@/components/owner/DateRangeField";

const DAY = 86400000;
const num = (s: string) => parseFloat(s.replace(",", "."));

const toForm = (l: LoyaltyT) => ({
  on: l.on,
  bOn: l.birthday.on, bPct: String(l.birthday.pct), bDays: String(l.birthday.daysBefore),
  vOn: l.visits.on, vEvery: String(l.visits.every), vRand: String(l.visits.cents / 100),
  sOn: l.spend.on, sEvery: String(l.spend.every / 100), sRand: String(l.spend.cents / 100),
  wPct: String(l.winback.pct), days: String(l.validDays),
});

type Props = { vouchers: Voucher[]; profiles: Record<string, Profile>; loyalty: LoyaltyT; now: Date };

export default function Loyalty({ vouchers, profiles, loyalty, now }: Props) {
  const t = now.getTime();
  const [f, setF] = useState(() => toForm(loyalty));
  const sig = JSON.stringify(loyalty);
  useEffect(() => setF(toForm(loyalty)), [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const [msg, setMsg] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const bPct = num(f.bPct), bDays = num(f.bDays), vEvery = num(f.vEvery), vRand = num(f.vRand);
    const sEvery = num(f.sEvery), sRand = num(f.sRand), wPct = num(f.wPct), days = num(f.days);
    if (![bPct, wPct].every((n) => n > 0 && n <= 100)) return setMsg("Percentages must be between 1 and 100.");
    if (![bDays, vEvery, vRand, sEvery, sRand, days].every((n) => n > 0)) return setMsg("Every number must be more than zero.");
    saveLoyalty({
      on: f.on,
      birthday: { on: f.bOn, pct: Math.round(bPct), daysBefore: Math.round(bDays) },
      visits: { on: f.vOn, every: Math.round(vEvery), cents: Math.round(vRand * 100) },
      spend: { on: f.sOn, every: Math.round(sEvery * 100), cents: Math.round(sRand * 100) },
      winback: { pct: Math.round(wPct) },
      validDays: Math.round(days),
    });
    setMsg("Saved. The new rules apply from the next order.");
    window.setTimeout(() => setMsg(""), 4000);
  };

  /* numbers */
  const stats = useMemo(() => {
    const s = { issued: vouchers.length, active: 0, redeemed: 0, expired: 0 };
    const by: Record<string, { issued: number; redeemed: number }> = {};
    for (const v of vouchers) {
      const st = voucherStatus(v, t);
      s[st]++;
      const b = (by[v.reason] ??= { issued: 0, redeemed: 0 });
      b.issued++;
      if (st === "redeemed") b.redeemed++;
    }
    return { ...s, by };
  }, [vouchers, t]);
  const rate = stats.issued ? Math.round((stats.redeemed / stats.issued) * 100) : 0;

  /* birthdays in the next 30 days */
  const coming = useMemo(
    () =>
      Object.entries(profiles)
        .flatMap(([phone, p]) => {
          if (!p.birthday) return [];
          const nb = nextBirthday(p.birthday, t);
          if (nb.days > 30) return [];
          return [{ phone, name: p.name, label: bdayLabel(p.birthday), days: nb.days, v: vouchers.find((x) => x.phone === phone && x.tag === `birthday-${nb.year}`), consent: p.consent }];
        })
        .sort((a, b) => a.days - b.days),
    [profiles, vouchers, t]
  );

  /* the voucher list */
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [reason, setReason] = useState("");
  const r = useDateRange(now);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const reset = () => setPage(0);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return vouchers
      .filter((v) => (!st || voucherStatus(v, t) === st) && (!reason || v.reason === reason) && inIso(v.issued, r.from, r.to) &&
        (!s || `${v.code} ${v.name} ${v.phone}`.toLowerCase().includes(s)))
      .sort((a, b) => b.issued.localeCompare(a.issued));
  }, [vouchers, q, st, reason, r.from, r.to, t]);
  const shown = slicePage(rows, page, size);

  const chips: Chip[] = [];
  if (q.trim()) chips.push({ label: `Search: ${q.trim()}`, clear: () => { setQ(""); reset(); } });
  if (st) chips.push({ label: st, clear: () => { setSt(""); reset(); } });
  if (reason) chips.push({ label: REASON_LABEL[reason as keyof typeof REASON_LABEL], clear: () => { setReason(""); reset(); } });
  if (r.active) chips.push({ label: r.label, clear: () => { r.clear(); reset(); } });
  const clearAll = () => { setQ(""); setSt(""); setReason(""); r.clear(); reset(); };

  const sample = (reasonName: Voucher["reason"], kind: Voucher["kind"], value: number) =>
    voucherText({
      code: "LV-AB12", phone: "", name: "Thandi Nkosi", kind, value, reason: reasonName, tag: "",
      issued: now.toISOString(), expires: new Date(t + loyalty.validDays * DAY).toISOString(), sms: true,
    });

  return (
    <div className="loy">
      <div className="cstats">
        <div className="cstat" data-s="all"><b>{stats.issued}</b><span>Vouchers issued</span><small>All time in this demo</small></div>
        <div className="cstat" data-s="active"><b>{stats.active}</b><span>Waiting to be used</span><small>Not yet redeemed or expired</small></div>
        <div className="cstat" data-s="new"><b>{stats.redeemed}</b><span>Redeemed</span><small>{rate}% of those issued</small></div>
        <div className="cstat" data-s="lapsed"><b>{stats.expired}</b><span>Expired unused</span><small>Not used in time</small></div>
      </div>

      <div className="ov__cols">
        <form className="card rules" onSubmit={save}>
          <div className="ov__head">
            <h2>Program rules</h2>
            <label className="checkline"><input type="checkbox" checked={f.on} onChange={(e) => set("on", e.target.checked)} /> Program is on</label>
          </div>

          <fieldset>
            <legend><label className="checkline"><input type="checkbox" checked={f.bOn} onChange={(e) => set("bOn", e.target.checked)} /> Birthday voucher</label></legend>
            <div className="inline-form">
              <label>Discount (%)<input className="amt" value={f.bPct} onChange={(e) => set("bPct", e.target.value)} inputMode="numeric" /></label>
              <label>Sent this many days before<input className="amt" value={f.bDays} onChange={(e) => set("bDays", e.target.value)} inputMode="numeric" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend><label className="checkline"><input type="checkbox" checked={f.vOn} onChange={(e) => set("vOn", e.target.checked)} /> Visit milestone</label></legend>
            <div className="inline-form">
              <label>Every this many visits<input className="amt" value={f.vEvery} onChange={(e) => set("vEvery", e.target.value)} inputMode="numeric" /></label>
              <label>Reward (R off)<input className="amt" value={f.vRand} onChange={(e) => set("vRand", e.target.value)} inputMode="decimal" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend><label className="checkline"><input type="checkbox" checked={f.sOn} onChange={(e) => set("sOn", e.target.checked)} /> Spend milestone</label></legend>
            <div className="inline-form">
              <label>Every this much spent (R)<input className="amt" value={f.sEvery} onChange={(e) => set("sEvery", e.target.value)} inputMode="decimal" /></label>
              <label>Reward (R off)<input className="amt" value={f.sRand} onChange={(e) => set("sRand", e.target.value)} inputMode="decimal" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Win-back and expiry</legend>
            <div className="inline-form">
              <label>Win-back discount (%)<input className="amt" value={f.wPct} onChange={(e) => set("wPct", e.target.value)} inputMode="numeric" /></label>
              <label>Vouchers last (days)<input className="amt" value={f.days} onChange={(e) => set("days", e.target.value)} inputMode="numeric" /></label>
            </div>
          </fieldset>

          {msg && <p className={msg.startsWith("Saved") ? "flash" : "err"} role="status">{msg}</p>}
          <button className="btn" type="submit">Save rules</button>
        </form>

        <div className="loy__side">
          <section className="card">
            <h2>What customers receive</h2>
            <p className="sms">{sample("birthday", "percent", loyalty.birthday.pct)}</p>
            <p className="sms">{sample("visits", "rand", loyalty.visits.cents)}</p>
            <p className="sms">{sample("spend", "rand", loyalty.spend.cents)}</p>
            <p className="sms">{sample("winback", "percent", loyalty.winback.pct)}</p>
            <p className="muted">Each voucher is texted once. It works once, on the next order, and cannot be swapped for cash.</p>
          </section>

          <section className="card">
            <div className="ov__head">
              <h2>Birthdays in the next 30 days</h2>
              <button className="btn btn--ghost btn--sm" onClick={() => setMsg(`${runBirthdayCheck(new Date())} birthday vouchers sent.`)}>Run birthday check</button>
            </div>
            {coming.length === 0 && <p className="muted">No birthdays coming up.</p>}
            {coming.map((b) => (
              <div key={b.phone} className="rowline">
                <span>{b.name}<br /><small className="muted">{showPhone(b.phone)}</small></span>
                <span className="muted">{b.label} ({b.days === 0 ? "today" : `in ${b.days} days`})</span>
                <b>{b.v ? (b.v.sms ? "Voucher sent" : "Voucher made, no SMS consent") : b.days <= loyalty.birthday.daysBefore ? "Due now" : `Sent ${loyalty.birthday.daysBefore} days before`}</b>
              </div>
            ))}
          </section>

          <section className="card">
            <h2>Results by reward</h2>
            {Object.entries(stats.by).map(([k, v]) => (
              <div key={k} className="rowline">
                <span>{REASON_LABEL[k as keyof typeof REASON_LABEL]}</span>
                <span className="muted">{v.issued} issued</span>
                <b>{v.issued ? Math.round((v.redeemed / v.issued) * 100) : 0}% redeemed</b>
              </div>
            ))}
          </section>
        </div>
      </div>

      <section className="card rec">
        <h2>All vouchers</h2>
        <div className="filters">
          <label className="grow">
            Search
            <input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Code, name or phone" />
          </label>
          <label>
            Status
            <select value={st} onChange={(e) => { setSt(e.target.value); reset(); }}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="redeemed">Redeemed</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label>
            Reward
            <select value={reason} onChange={(e) => { setReason(e.target.value); reset(); }}>
              <option value="">All rewards</option>
              {Object.entries(REASON_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <DateRangeField r={r} onChange={reset} />
        </div>
        <FilterChips chips={chips} onClearAll={clearAll} />
        <p className="sumline"><span><b>{rows.length}</b> vouchers</span></p>

        <div className="tablewrap">
          <table>
            <thead><tr><th>Code</th><th>Customer</th><th>Offer</th><th>Reward</th><th>Issued</th><th>Expires</th><th>Status</th><th>SMS</th></tr></thead>
            <tbody>
              {shown.map((v) => {
                const s: VStatus = voucherStatus(v, t);
                return (
                  <tr key={v.code}>
                    <td>{v.code}</td>
                    <td>{v.name}<br /><small>{showPhone(v.phone)}</small></td>
                    <td>{voucherLabel(v)}</td>
                    <td>{REASON_LABEL[v.reason]}</td>
                    <td>{dayLong(v.issued)}</td>
                    <td>{dayLong(v.expires)}</td>
                    <td><span className={`vs vs--${s}`}>{s}</span>{v.orderId && <><br /><small>on {v.orderId}</small></>}</td>
                    <td>{v.sms ? "Sent" : "No consent"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!shown.length && <p className="empty">No vouchers match. <button className="link" onClick={clearAll}>Clear all</button></p>}
        </div>
        <Pager page={page} size={size} total={rows.length} onPage={setPage} onSize={(s) => { setSize(s); reset(); }} />
      </section>
    </div>
  );
}
