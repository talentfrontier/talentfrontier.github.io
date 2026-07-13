"use client";

import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useData } from "@/lib/api";
import { mockLeads } from "@/lib/mock-data";
import { timeAgo } from "@/lib/utils";

const STAGE_TONE: Record<string, "neutral" | "brand" | "good" | "warning"> = {
  NEW_LEAD: "neutral",
  CONTACTED: "neutral",
  INTERESTED: "brand",
  QUALIFIED: "brand",
  APPOINTMENT: "good",
  PROPOSAL_SENT: "good",
  NEGOTIATION: "good",
  WON: "good",
  LOST: "warning",
};

export default function LeadsPage() {
  const { data } = useData<{ items: typeof mockLeads }>("/leads", { items: mockLeads });
  const leads = Array.isArray(data) ? data : data.items;

  return (
    <>
      <Topbar title="CRM & Leads" />
      <main className="p-6">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted">
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Score</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-[var(--plane)]">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{lead.name}</p>
                    <p className="text-xs text-muted">{lead.email ?? lead.phone ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3 text-ink-2">{lead.source.replaceAll("_", " ")}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--hairline)]">
                        <div
                          className="h-full rounded-full bg-[var(--series-1)]"
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                      <span
                        className="text-xs font-medium text-ink"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {lead.score}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STAGE_TONE[lead.stage] ?? "neutral"}>
                      {lead.stage.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">{timeAgo(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
