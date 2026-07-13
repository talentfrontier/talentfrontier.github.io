"use client";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg bg-surface px-3 text-sm text-ink ring-1 ring-[var(--ring)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--series-1)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg bg-surface px-3 py-2 text-sm text-ink ring-1 ring-[var(--ring)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--series-1)]",
        className,
      )}
      {...props}
    />
  );
}
