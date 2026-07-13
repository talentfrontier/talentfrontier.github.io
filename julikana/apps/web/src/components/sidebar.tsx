"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "▦" },
  { href: "/domo", label: "Ask Domo", icon: "✦" },
  { href: "/leads", label: "CRM & Leads", icon: "◎" },
  { href: "/conversations", label: "Inbox", icon: "◇" },
  { href: "/content", label: "Content", icon: "▤" },
  { href: "/campaigns", label: "Campaigns", icon: "▷" },
  { href: "/email", label: "Email", icon: "✉" },
  { href: "/workflows", label: "Automations", icon: "⇄" },
  { href: "/analytics", label: "Analytics", icon: "∿" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r bg-surface md:flex">
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--series-1)] text-sm font-bold text-white">
          J
        </span>
        <span className="text-base font-semibold text-ink">Julikana</span>
      </Link>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[color-mix(in_srgb,var(--series-1)_12%,transparent)] font-medium text-[var(--series-1)]"
                  : "text-ink-2 hover:bg-[var(--hairline)]",
              )}
            >
              <span aria-hidden className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-5 py-4">
        <p className="text-xs font-medium text-ink">Demo Realty</p>
        <p className="text-[11px] text-muted">Professional plan</p>
      </div>
    </aside>
  );
}
