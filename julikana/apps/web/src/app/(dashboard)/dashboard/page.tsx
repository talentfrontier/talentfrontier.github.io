"use client";

import { LineChart } from "@/components/charts/line-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useData } from "@/lib/api";
import {
  mockFunnel,
  mockSeries,
  mockSuggestions,
  mockSummary,
  mockTasks,
} from "@/lib/mock-data";
import { formatCompact, formatMoney, timeAgo } from "@/lib/utils";

const TASK_TONE = { RUNNING: "brand", QUEUED: "neutral", COMPLETED: "good", FAILED: "critical" } as const;

export default function DashboardPage() {
  const { data: summary, live } = useData("/analytics/summary", mockSummary);
  const { data: series } = useData("/analytics/timeseries", mockSeries);
  const funnel = mockFunnel;
  const tasks = mockTasks;
  const suggestions = mockSuggestions;

  return (
    <>
      <Topbar title="Overview" />
      <main className="space-y-4 p-6">
        {!live && (
          <p className="rounded-lg bg-[color-mix(in_srgb,var(--series-3)_14%,transparent)] px-3 py-2 text-xs text-ink-2">
            Showing demo data — connect the Julikana API to see your workspace.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Revenue (30d)" value={formatMoney(summary.revenueCents)} delta={12} />
          <StatTile label="New leads" value={String(summary.leads)} delta={summary.leadsDelta} />
          <StatTile label="Conversations" value={String(summary.conversations)} delta={7} />
          <StatTile
            label="Engagement rate"
            value={`${summary.engagementRate}%`}
            delta={3}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Reach & engagement"
              subtitle="Daily totals across connected platforms — last 30 days"
            />
            <CardBody>
              <LineChart
                data={series}
                series={[
                  { key: "reach", label: "Reach", color: "var(--series-1)" },
                  { key: "engagements", label: "Engagements", color: "var(--series-2)" },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sales funnel" subtitle="Active leads by stage" />
            <CardBody>
              <FunnelChart data={funnel} />
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader title="Domo is working on" subtitle={`${summary.aiTasksRunning} running · ${summary.aiTasksCompleted} done this month`} />
            <CardBody className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{task.title}</p>
                    <p className="text-[11px] text-muted">
                      {task.agent.replaceAll("_", " ").toLowerCase()} · {timeAgo(task.createdAt)}
                    </p>
                  </div>
                  <Badge tone={TASK_TONE[task.status as keyof typeof TASK_TONE]}>
                    {task.status === "RUNNING" ? `${task.progress}%` : task.status.toLowerCase()}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Followers" subtitle="By platform" />
            <CardBody className="space-y-3">
              {summary.followers.map((f) => (
                <div key={f.platform} className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">{f.platform.toLowerCase()}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCompact(f.followerCount)}
                    </span>
                    {!f.connected && <Badge tone="critical">reconnect</Badge>}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 text-xs text-muted">
                Reach {formatCompact(summary.reach)} · Clicks {formatCompact(summary.clicks)} ·{" "}
                {summary.scheduledPosts} posts scheduled
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Domo suggests" subtitle="Fresh ideas from your data" />
            <CardBody className="space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="rounded-lg bg-[var(--plane)] p-3">
                  <p className="text-sm font-medium text-ink">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">{s.body}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </main>
    </>
  );
}
