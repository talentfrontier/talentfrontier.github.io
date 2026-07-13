"use client";

import { useState } from "react";

const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New lead",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  QUALIFIED: "Qualified",
  APPOINTMENT: "Appointment",
  PROPOSAL_SENT: "Proposal sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
};

/** Ordinal sequential ramp (one hue, light→dark), steps 250→650. */
const RAMP = [
  "var(--seq-250)",
  "var(--seq-300)",
  "var(--seq-350)",
  "var(--seq-400)",
  "var(--seq-450)",
  "var(--seq-500)",
  "var(--seq-550)",
  "var(--seq-650)",
];

/**
 * Horizontal funnel: ordered magnitude → one hue stepped light→dark.
 * Bars are thin with rounded data-ends, 2px gaps, and direct labels
 * (values never rely on color alone).
 */
export function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-0.5" role="img" aria-label="Sales funnel by stage">
      {data.map((row, i) => (
        <div
          key={row.stage}
          className="group flex items-center gap-3 rounded-md px-1 py-1"
          onPointerEnter={() => setHover(row.stage)}
          onPointerLeave={() => setHover(null)}
          style={{ background: hover === row.stage ? "var(--hairline)" : "transparent" }}
        >
          <span className="w-28 shrink-0 text-xs text-ink-2">
            {STAGE_LABELS[row.stage] ?? row.stage}
          </span>
          <div className="relative h-4 flex-1">
            <div
              className="absolute inset-y-0 left-0 rounded-r"
              style={{
                width: `${Math.max(1.5, (row.count / max) * 100)}%`,
                background: RAMP[i % RAMP.length],
              }}
            />
          </div>
          <span
            className="w-10 shrink-0 text-right text-xs font-medium text-ink"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}
