"use client";
import { useState } from "react";
import { PRESETS, rangeFor, type Preset } from "@/lib/filters";

export function useDateRange(now: Date) {
  const [preset, setPresetState] = useState<Preset>("all");
  const [from, setFromState] = useState("");
  const [to, setToState] = useState("");

  const setPreset = (p: Preset) => {
    setPresetState(p);
    if (p !== "custom") {
      const r = rangeFor(p, now);
      setFromState(r.from);
      setToState(r.to);
    }
  };
  const setFrom = (v: string) => {
    setFromState(v);
    setPresetState("custom");
  };
  const setTo = (v: string) => {
    setToState(v);
    setPresetState("custom");
  };
  const clear = () => {
    setPresetState("all");
    setFromState("");
    setToState("");
  };

  const active = !!(from || to);
  const label =
    preset !== "custom" && preset !== "all"
      ? (PRESETS.find((p) => p[0] === preset)?.[1] ?? "")
      : `${from || "start"} to ${to || "today"}`;

  return { preset, from, to, setPreset, setFrom, setTo, clear, active, label };
}

export type DateRange = ReturnType<typeof useDateRange>;
