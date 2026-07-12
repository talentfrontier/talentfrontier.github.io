"use client";

import { ThemeToggle } from "./theme-toggle";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-[color-mix(in_srgb,var(--plane)_88%,transparent)] px-6 backdrop-blur">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 ring-1 ring-[var(--ring)] hover:bg-[var(--hairline)]"
        >
          🔔
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--status-critical)] ring-2 ring-[var(--plane)]" />
        </button>
        <ThemeToggle />
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--series-5)] text-xs font-semibold text-white"
          title="Demo Owner"
        >
          DO
        </div>
      </div>
    </header>
  );
}
