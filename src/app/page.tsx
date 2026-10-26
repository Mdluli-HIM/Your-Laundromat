import Link from "next/link";

const FEATURES = [
  ["Orders board", "Every order moves from Received to Collected with one tap."],
  ["SMS updates", "Customers get a message when their laundry arrives and when it is ready."],
  ["Live tracking", "A link in the SMS shows progress, the amount due and opening hours."],
  ["Fewer calls", "No more \"is my laundry ready?\" phone calls at the counter."],
  ["Uncollected alerts", "See what has been waiting for days, and send a reminder in one tap."],
  ["Daily summary", "Orders, what is ready and takings for the day at a glance."],
];

export default function Home() {
  return (
    <main className="home">
      <section className="home__hero">
        <h1>Know where every load is.</h1>
        <p>Staff manage orders on a phone or tablet. Customers get an SMS and a link that shows exactly where their laundry is.</p>
        <div className="row">
          <Link href="/demo" className="btn">Open the presenter view</Link>
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
