"use client";
import { useState } from "react";
import type { Bar } from "@/lib/reports";
import { rand } from "@/lib/format";

export default function BarChart({ bars }: { bars: Bar[] }) {
  const [h, setH] = useState(-1);
  const max = Math.max(1, ...bars.map((b) => b.cents));
  const step = bars.length > 20 ? 3 : 1;
  return (
    <div className="chart">
      <p className="chart__tip">
        {h >= 0 ? `${bars[h].full}: ${rand(bars[h].cents)} from ${bars[h].count} orders` : "Point at a bar for details"}
      </p>
      <div className="chart__bars" onPointerLeave={() => setH(-1)}>
        {bars.map((b, i) => (
          <div key={i} className={`chart__col ${h === i ? "is-on" : ""}`} onPointerEnter={() => setH(i)} onClick={() => setH(i)}>
            <span className="chart__bar" style={{ height: `${Math.max(2, (b.cents / max) * 100)}%` }} />
            <small>{i % step === 0 ? b.label : ""}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
