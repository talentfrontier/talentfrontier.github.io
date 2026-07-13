"use client";

import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { useData } from "@/lib/api";
import { mockConversations } from "@/lib/mock-data";
import { timeAgo } from "@/lib/utils";

export default function ConversationsPage() {
  const { data: conversations } = useData("/conversations", mockConversations);

  return (
    <>
      <Topbar title="Inbox" />
      <main className="space-y-3 p-6">
        {conversations.map((c: (typeof mockConversations)[number]) => (
          <Card key={c.id} className="transition-shadow hover:shadow-md">
            <CardBody className="flex items-center gap-4 !py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--series-5)] text-sm font-semibold text-white">
                {(c.lead?.name ?? "?").slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{c.lead?.name ?? "Unknown visitor"}</p>
                  <span className="text-[11px] text-muted">via {c.channel.replaceAll("_", " ")}</span>
                </div>
                <p className="truncate text-sm text-ink-2">{c.lastMessage}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {c.status === "AI_HANDLING" ? (
                  <Badge tone="brand">✦ Domo handling</Badge>
                ) : c.status === "NEEDS_HUMAN" ? (
                  <Badge tone="warning">needs human</Badge>
                ) : (
                  <Badge>closed</Badge>
                )}
                <span className="text-[11px] text-muted">{timeAgo(c.updatedAt)}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </main>
    </>
  );
}
