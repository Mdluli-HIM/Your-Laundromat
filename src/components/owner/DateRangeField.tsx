"use client";
import { PRESETS, type Preset } from "@/lib/filters";
import type { DateRange } from "@/lib/useDateRange";

export default function DateRangeField({ r, onChange }: { r: DateRange; onChange?: () => void }) {
  return (
    <>
      <label>
        Period
        <select
          value={r.preset}
          onChange={(e) => {
            r.setPreset(e.target.value as Preset);
            onChange?.();
          }}
        >
          {PRESETS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </label>
      <label>
        From
        <input type="date" value={r.from} max={r.to || undefined} onChange={(e) => { r.setFrom(e.target.value); onChange?.(); }} />
      </label>
      <label>
        To
        <input type="date" value={r.to} min={r.from || undefined} onChange={(e) => { r.setTo(e.target.value); onChange?.(); }} />
      </label>
    </>
  );
}
