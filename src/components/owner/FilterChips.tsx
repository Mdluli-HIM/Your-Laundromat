"use client";

export type Chip = { label: string; clear: () => void };

export default function FilterChips({ chips, onClearAll }: { chips: Chip[]; onClearAll: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="fchips">
      <span>Filters:</span>
      {chips.map((c) => (
        <button key={c.label} className="fchip" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
          {c.label} <b aria-hidden="true">×</b>
        </button>
      ))}
      <button className="link" onClick={onClearAll}>Clear all</button>
    </div>
  );
}
