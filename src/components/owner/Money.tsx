"use client";
import { useMemo, useState } from "react";
import { addCashup, addExpense, CATEGORIES, type Cashup, type Expense, type Order } from "@/lib/store";
import { dkey, paidBetween, spentBetween } from "@/lib/reports";
import { rand } from "@/lib/format";
import CashupHistory from "@/components/owner/CashupHistory";
import ExpenseList from "@/components/owner/ExpenseList";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Money({ all, expenses, cashups, now }: { all: Order[]; expenses: Expense[]; cashups: Cashup[]; now: Date }) {
  const today = dkey(now);
  const [counted, setCounted] = useState("");
  const [cnote, setCnote] = useState("");
  const [cerr, setCerr] = useState("");
  const [date, setDate] = useState(today);
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [eerr, setEerr] = useState("");

  const todays = useMemo(() => {
    const t = { cash: 0, card: 0, eft: 0 };
    for (const o of all) {
      if (o.paid && o.collectedAt && dkey(new Date(o.collectedAt)) === today) t[o.method ?? "cash"] += o.cents;
    }
    return t;
  }, [all, today]);
  const done = cashups.find((c) => c.date === today);
  const months = useMemo(() => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const f = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const t = new Date(f.getFullYear(), f.getMonth() + 1, 1);
      const rev = paidBetween(all, f, t).cents;
      const spent = spentBetween(expenses, f, t);
      out.push({ label: `${MON[f.getMonth()]} ${f.getFullYear()}`, rev, spent, profit: rev - spent });
    }
    return out;
  }, [all, expenses, now]);

  const submitCash = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(counted.replace(",", "."));
    if (!(v >= 0)) return setCerr("Enter the cash you counted in the till.");
    setCerr("");
    addCashup({ date: today, expected: todays.cash, counted: Math.round(v * 100), note: cnote.trim() });
    setCounted("");
    setCnote("");
  };
  const submitExp = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(amount.replace(",", "."));
    if (!(v > 0)) return setEerr("Enter the amount.");
    if (!date) return setEerr("Choose the date.");
    setEerr("");
    addExpense({ date, category: cat, note: note.trim(), cents: Math.round(v * 100) });
    setNote("");
    setAmount("");
  };
  const diff = done ? done.counted - done.expected : 0;

  return (
    <div className="mon">
      <section className="card">
        <h2>Today&apos;s cash-up</h2>
        <div className="mon__split">
          <div><span className="label">Expected cash</span><b className="ov__big">{rand(todays.cash)}</b></div>
          <div><span className="label">Card</span><b>{rand(todays.card)}</b></div>
          <div><span className="label">EFT</span><b>{rand(todays.eft)}</b></div>
        </div>
        {done ? (
          <p className={diff === 0 ? "up" : "down"}>
            Submitted by {done.by}: counted {rand(done.counted)}.{" "}
            {diff === 0 ? "Balanced." : `${diff > 0 ? "Over" : "Short"} by ${rand(Math.abs(diff))}.`}
          </p>
        ) : (
          <form className="mon__form" onSubmit={submitCash} noValidate>
            <label>Cash counted in the till (R)<input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="decimal" /></label>
            <label>Note (optional)<input value={cnote} onChange={(e) => setCnote(e.target.value)} /></label>
            {cerr && <p className="err" role="alert">{cerr}</p>}
            <button className="btn" type="submit">Submit cash-up</button>
          </form>
        )}
      </section>

      <CashupHistory cashups={cashups} now={now} />

      <section className="card">
        <h2>Income, expenses and profit</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Profit</th></tr></thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td>{rand(m.rev)}</td>
                  <td>{rand(m.spent)}</td>
                  <td className={m.profit >= 0 ? "up" : "down"}><b>{rand(m.profit)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">Income is counted when the customer collects and pays. This is a management view, not accounting or tax advice.</p>
      </section>

      <section className="card">
        <h2>Record an expense</h2>
        <form className="mon__form" onSubmit={submitExp} noValidate>
          <label>Date<input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Category
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Amount (R)<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></label>
          <label>Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {eerr && <p className="err" role="alert">{eerr}</p>}
          <button className="btn" type="submit">Add expense</button>
        </form>
        <ExpenseList expenses={expenses} now={now} />
      </section>
    </div>
  );
}
