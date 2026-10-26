import StaffApp from "@/components/StaffApp";
import Phone from "@/components/Phone";

const STEPS = [
  "Press New order and fill in a customer",
  "Watch the SMS arrive on the phone",
  "Press the link in the message",
  "Move the order along the board",
  "When it is Ready, watch the second SMS arrive",
  "Press Collected and paid",
];

export default function Demo() {
  return (
    <main className="demo">
      <ol className="guide">
        {STEPS.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <div className="demo__grid">
        <section className="demo__staff">
          <h2 className="label">Staff screen</h2>
          <StaffApp compact />
        </section>
        <aside className="demo__phone">
          <h2 className="label">Customer&apos;s phone</h2>
          <Phone />
        </aside>
      </div>
    </main>
  );
}
