"use client";
import { useMemo, useState } from "react";
import { useDemo } from "@/lib/useDemo";
import Overview from "@/components/owner/Overview";
import Records from "@/components/owner/Records";
import Customers from "@/components/owner/Customers";
import Loyalty from "@/components/owner/Loyalty";
import Money from "@/components/owner/Money";
import AuditLog from "@/components/owner/AuditLog";

const TABS = [
  ["overview", "Overview"],
  ["customers", "Customers"],
  ["loyalty", "Loyalty"],
  ["records", "Records"],
  ["money", "Money"],
  ["audit", "Audit log"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function OwnerApp() {
  const d = useDemo();
  const [tab, setTab] = useState<Tab>("overview");
  const now = useMemo(() => new Date(d.now), [d.now]);
  if (!d.ready || !d.now) return <p className="muted">Loading…</p>;

  /* every tab stays loaded and the others are hidden, so filters and pages are still there when you come back */
  return (
    <div className="owner">
      <p className="muted">Sample figures for the demo. In the live version only the owner can open this page.</p>
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" hidden={tab !== "overview"}><Overview all={d.all} live={d.orders} now={now} /></div>
      <div role="tabpanel" hidden={tab !== "customers"}><Customers all={d.all} profiles={d.profiles} vouchers={d.vouchers} now={now} /></div>
      <div role="tabpanel" hidden={tab !== "loyalty"}><Loyalty vouchers={d.vouchers} profiles={d.profiles} loyalty={d.loyalty} now={now} /></div>
      <div role="tabpanel" hidden={tab !== "records"}><Records all={d.all} now={now} /></div>
      <div role="tabpanel" hidden={tab !== "money"}><Money all={d.all} expenses={d.expenses} cashups={d.cashups} now={now} /></div>
      <div role="tabpanel" hidden={tab !== "audit"}><AuditLog audit={d.audit} now={now} /></div>
    </div>
  );
}
