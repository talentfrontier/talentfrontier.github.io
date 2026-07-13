"use client";

import { LineChart } from "@/components/charts/line-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { Topbar } from "@/components/topbar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useData } from "@/lib/api";
import { mockSeries, mockSummary } from "@/lib/mock-data";
import { formatCompact } from "@/lib/utils";

export default function AnalyticsPage() {
  const { data: series } = useData("/analytics/timeseries", mockSeries);
  const { data: summary } = useData("/analytics/summary", mockSummary);

  return (
    <>
      <Topbar title="Analytics" />
      <main className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Reach (30d)" value={formatCompact(summary.reach)} delta={9} />
          <StatTile label="Clicks" value={formatCompact(summary.clicks)} delta={14} />
          <StatTile label="Leads" value={String(summary.leads)} delta={summary.leadsDelta} />
          <StatTile label="Engagement rate" value={`${summary.engagementRate}%`} delta={3} />
        </div>

        {/* Different scales → separate charts, never a second y-axis. */}
        <Card>
          <CardHeader title="Audience growth" subtitle="Total followers — last 30 days" />
          <CardBody>
            <LineChart
              data={series}
              series={[{ key: "followers", label: "Followers", color: "var(--series-1)" }]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Leads per day" subtitle="New leads captured — last 30 days" />
          <CardBody>
            <LineChart
              data={series}
              series={[{ key: "leads", label: "New leads", color: "var(--series-2)" }]}
              height={180}
            />
          </CardBody>
        </Card>
      </main>
    </>
  );
}
