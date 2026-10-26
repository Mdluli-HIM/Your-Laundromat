"use client";
import { useEffect, useState } from "react";
import TrackView from "@/components/TrackView";
import { useDemo } from "@/lib/useDemo";
import { last4 } from "@/lib/phone";

export default function Track() {
  const { orders } = useDemo();
  const [t, setT] = useState("");
  const [digits, setDigits] = useState("");
  const [view, setView] = useState("");
  const [err, setErr] = useState("");

  /* the link in the SMS opens the page with the ticket already filled in */
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("t");
    if (q) setView(q.toUpperCase());
  }, []);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const o = orders.find((x) => x.id === t.trim().toUpperCase());
    if (!o || last4(o.phone) !== digits.trim()) {
      setView("");
      return setErr("We could not find that order. Check the ticket and the last 4 digits of your phone number.");
    }
    setErr("");
    setView(o.id);
  };

  return (
    <main className="page narrow">
      {view ? (
        <TrackView ticket={view} />
      ) : (
        <>
          <h1>Track your laundry</h1>
          <p className="muted">Enter the ticket number from your slip or SMS, and the last 4 digits of your phone number.</p>
          <form className="neworder card" onSubmit={find} noValidate>
            <label>Ticket number<input value={t} onChange={(e) => setT(e.target.value)} placeholder="LW-4K7Q" /></label>
            <label>Last 4 digits of your phone<input value={digits} onChange={(e) => setDigits(e.target.value)} inputMode="numeric" maxLength={4} placeholder="0101" /></label>
            {err && <p className="err" role="alert">{err}</p>}
            <button className="btn" type="submit">Track my order</button>
          </form>
          <p className="muted">Try the sample order LW-4K7Q with 0101.</p>
        </>
      )}
    </main>
  );
}
