import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { api, demoSummary } from "../api";
import { Card, StatTile } from "../components";
import { Theme } from "../theme";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function DashboardScreen({ theme }: { theme: Theme }) {
  const [summary, setSummary] = useState(demoSummary);
  const [live, setLive] = useState(false);

  useEffect(() => {
    api<typeof demoSummary>("/analytics/summary")
      .then((data) => {
        setSummary(data);
        setLive(true);
      })
      .catch(() => {});
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {!live && (
        <Text style={{ color: theme.ink2, fontSize: 11, backgroundColor: theme.warning + "26", padding: 8, borderRadius: 8 }}>
          Demo data — sign in with your workspace to go live.
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatTile theme={theme} label="Revenue (30d)" value={money(summary.revenueCents)} delta={12} />
        <StatTile theme={theme} label="New leads" value={String(summary.leads)} delta={summary.leadsDelta} />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatTile theme={theme} label="Conversations" value={String(summary.conversations)} delta={7} />
        <StatTile theme={theme} label="Engagement" value={`${summary.engagementRate}%`} delta={3} />
      </View>
      <Card theme={theme}>
        <Text style={{ color: theme.ink, fontWeight: "600", fontSize: 14 }}>Domo right now</Text>
        <Text style={{ color: theme.ink2, fontSize: 13, marginTop: 6 }}>
          {summary.aiTasksRunning} tasks running · {summary.aiTasksCompleted} completed this month ·{" "}
          {summary.scheduledPosts} posts scheduled
        </Text>
      </Card>
    </ScrollView>
  );
}
