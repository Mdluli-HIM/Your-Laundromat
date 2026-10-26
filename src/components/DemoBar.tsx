"use client";
import Link from "next/link";
import { useDemo } from "@/lib/useDemo";
import { setShopName } from "@/lib/brand";
import { resetDemo } from "@/lib/store";

export default function DemoBar() {
  const { shop } = useDemo();
  return (
    <>
      <div className="banner">Demo with sample data. No real messages are sent and nothing leaves this browser.</div>
      <header className="top">
        <Link href="/" className="brand">{shop || "Laundry desk"}</Link>
        <nav>
          <Link href="/demo">Presenter view</Link>
          <Link href="/staff">Staff app</Link>
          <Link href="/track">Customer page</Link>
        </nav>
        <div className="top__tools">
          <label>
            Shop name
            <input
              key={shop}
              defaultValue={shop}
              maxLength={40}
              onBlur={(e) => setShopName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </label>
          <button className="btn btn--ghost btn--sm" onClick={() => confirm("Reset the demo to its sample data?") && resetDemo()}>
            Reset demo
          </button>
        </div>
      </header>
    </>
  );
}
