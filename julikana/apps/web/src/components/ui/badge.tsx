import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-[var(--hairline)] text-ink-2",
  good: "bg-[color-mix(in_srgb,var(--status-good)_15%,transparent)] text-[var(--status-good)]",
  warning:
    "bg-[color-mix(in_srgb,var(--status-warning)_18%,transparent)] text-[var(--text-primary)]",
  critical:
    "bg-[color-mix(in_srgb,var(--status-critical)_15%,transparent)] text-[var(--status-critical)]",
  brand:
    "bg-[color-mix(in_srgb,var(--series-1)_14%,transparent)] text-[var(--series-1)]",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
