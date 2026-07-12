"use client";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-[var(--series-1)] text-white hover:opacity-90 focus-visible:outline-[var(--series-1)]",
  secondary:
    "bg-transparent text-ink ring-1 ring-[var(--ring)] hover:bg-[var(--hairline)]",
  ghost: "bg-transparent text-ink-2 hover:bg-[var(--hairline)]",
  danger: "bg-[var(--status-critical)] text-white hover:opacity-90",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
