"use client";

import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useData } from "@/lib/api";
import { mockCampaigns } from "@/lib/mock-data";
import { formatMoney } from "@/lib/utils";

export default function CampaignsPage() {
  const { data: campaigns } = useData("/campaigns", mockCampaigns);

  return (
    <>
      <Topbar title="Campaigns" />
      <main className="grid gap-4 p-6 lg:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c: (typeof mockCampaigns)[number]) => {
          const spentPct = c.budgetCents
            ? Math.min(100, Math.round((c.spentCents / c.budgetCents) * 100))
            : 0;
          return (
            <Card key={c.id}>
              <CardHeader
                title={c.name}
                subtitle={`${c.objective} · ${c._count.contentItems} assets`}
                action={
                  <Badge tone={c.status === "ACTIVE" ? "good" : "neutral"}>
                    {c.status.toLowerCase()}
                  </Badge>
                }
              />
              <CardBody>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-2">Budget used</span>
                  <span className="font-medium text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatMoney(c.spentCents)} / {formatMoney(c.budgetCents)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hairline)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${spentPct}%`,
                      background: spentPct > 85 ? "var(--status-serious)" : "var(--series-1)",
                    }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.platforms.map((p: string) => (
                    <span key={p} className="rounded-full bg-[var(--plane)] px-2 py-0.5 text-[11px] text-ink-2">
                      {p.toLowerCase()}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </main>
    </>
  );
}
