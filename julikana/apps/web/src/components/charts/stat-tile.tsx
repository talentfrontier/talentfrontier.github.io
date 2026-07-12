import { Card } from "@/components/ui/card";

/** Headline number with a labeled delta — a stat tile, not a chart. */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {delta !== undefined && (
        <p className="mt-1 text-xs">
          <span
            className={
              delta >= 0 ? "text-[var(--delta-up)]" : "text-[var(--status-critical)]"
            }
          >
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
          </span>{" "}
          <span className="text-muted">{deltaLabel ?? "vs previous 30 days"}</span>
        </p>
      )}
    </Card>
  );
}
