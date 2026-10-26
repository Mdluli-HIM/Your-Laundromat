import Link from "next/link";

const FEATURES = [
  ["Orders board", "Every order moves from Received to Collected with one tap."],
  ["SMS updates", "Customers get a message when their laundry arrives and when it is ready."],
  ["Live tracking", "A link in the SMS shows progress, the amount due and opening hours."],
  ["Income reports", "Daily, weekly, monthly and yearly income, compared with the period before."],
  ["Cash-up", "Expected cash against counted cash every evening, with differences flagged."],
  ["Expenses and profit", "Record rent, wages, power and supplies, and see real profit by month."],
  ["Digital records", "Every order ever, searchable, with one-click export for the accountant."],
  ["Audit trail", "A record of who did what and when. It cannot be edited or deleted."],
  ["Uncollected alerts", "See what has been waiting for days, and send a reminder in one tap."],
];

export default function Home() {
  return (
    <main className="home">
      <section className="home__hero">
        <h1>Know where every load is, and every rand.</h1>
        <p>Staff manage orders on a phone or tablet. Customers get an SMS and a tracking link. The owner gets records, reports and an audit trail, with no paper.</p>
        <div className="row">
          <Link href="/demo" className="btn">Open the presenter view</Link>
          <Link href="/owner" className="btn btn--ghost">Owner view</Link>
          <Link href="/staff" className="btn btn--ghost">Staff app</Link>
          <Link href="/track" className="btn btn--ghost">Customer page</Link>
        </div>
      </section>
      <section className="home__grid">
        {FEATURES.map(([t, d]) => (
          <article key={t} className="card">
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
