"use client";

import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { useData } from "@/lib/api";
import { mockWorkflows } from "@/lib/mock-data";

/** Example flow rendered as a horizontal node strip (read-only preview of
 *  the drag-and-drop builder graph). */
const EXAMPLE_NODES = [
  "Comment contains \"price\"",
  "Reply to comment",
  "Send Messenger DM",
  "Add to CRM",
  "Send WhatsApp message",
  "Follow-up in 24h",
  "Notify sales team",
];

export default function WorkflowsPage() {
  const { data: workflows } = useData("/workflows", mockWorkflows);

  return (
    <>
      <Topbar title="Automations" />
      <main className="space-y-4 p-6">
        <Card>
          <CardBody className="!py-4">
            <p className="text-sm font-medium text-ink">Builder preview</p>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
              {EXAMPLE_NODES.map((node, i) => (
                <div key={node} className="flex shrink-0 items-center gap-2">
                  <div
                    className={
                      i === 0
                        ? "rounded-lg bg-[color-mix(in_srgb,var(--series-1)_14%,transparent)] px-3 py-2 text-xs font-medium text-[var(--series-1)]"
                        : "rounded-lg bg-[var(--plane)] px-3 py-2 text-xs text-ink-2 ring-1 ring-[var(--ring)]"
                    }
                  >
                    {node}
                  </div>
                  {i < EXAMPLE_NODES.length - 1 && <span className="text-muted">→</span>}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {workflows.map((w: (typeof mockWorkflows)[number]) => (
          <Card key={w.id}>
            <CardBody className="flex items-center justify-between !py-4">
              <div>
                <p className="text-sm font-medium text-ink">{w.name}</p>
                <p className="text-xs text-muted">{w._count.runs} runs</p>
              </div>
              <Badge tone={w.enabled ? "good" : "neutral"}>
                {w.enabled ? "enabled" : "paused"}
              </Badge>
            </CardBody>
          </Card>
        ))}
      </main>
    </>
  );
}
