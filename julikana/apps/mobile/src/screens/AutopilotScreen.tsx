import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { api } from "../api";
import { Card } from "../components";
import { Theme } from "../theme";

interface Report {
  enabled: boolean;
  intensity: string;
  lastRunAt?: string;
  last7Days: { tasksCompleted: number; postsPublished: number; newLeads: number; dealsWon: number };
  pipeline: { tasksRunning: number; postsScheduled: number };
}

const DEMO: Report = {
  enabled: true,
  intensity: "balanced",
  lastRunAt: new Date().toISOString(),
  last7Days: { tasksCompleted: 34, postsPublished: 18, newLeads: 62, dealsWon: 4 },
  pipeline: { tasksRunning: 3, postsScheduled: 11 },
};

const INTENSITIES = ["gentle", "balanced", "aggressive"] as const;

export function AutopilotScreen({ theme }: { theme: Theme }) {
  const [report, setReport] = useState<Report>(DEMO);
  const [enabled, setEnabled] = useState(DEMO.enabled);
  const [intensity, setIntensity] = useState<string>(DEMO.intensity);

  useEffect(() => {
    api<Report>("/autopilot/report")
      .then((r) => {
        setReport(r);
        setEnabled(r.enabled);
        setIntensity(r.intensity);
      })
      .catch(() => {});
  }, []);

  async function toggle(value: boolean) {
    setEnabled(value);
    api("/autopilot", { method: "PATCH", body: JSON.stringify({ enabled: value }) }).catch(() => {});
  }

  async function setLevel(level: string) {
    setIntensity(level);
    api("/autopilot", { method: "PATCH", body: JSON.stringify({ intensity: level }) }).catch(() => {});
  }

  const stat = (label: string, value: number) => (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.ink, fontSize: 20, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: theme.muted, fontSize: 11 }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card theme={theme}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: theme.ink, fontWeight: "700", fontSize: 15 }}>
              Domo works on its own
            </Text>
            <Text style={{ color: theme.ink2, fontSize: 12, marginTop: 4 }}>
              Creates, schedules and posts at peak hours — within safe limits so accounts
              never get flagged. You just read the reports.
            </Text>
          </View>
          <Switch value={enabled} onValueChange={toggle} />
        </View>
      </Card>

      <Card theme={theme}>
        <Text style={{ color: theme.ink, fontWeight: "600", fontSize: 13, marginBottom: 8 }}>
          Growth intensity
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {INTENSITIES.map((level) => {
            const active = level === intensity;
            return (
              <Pressable
                key={level}
                onPress={() => setLevel(level)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: active ? theme.brand : theme.plane,
                  borderWidth: 1,
                  borderColor: active ? theme.brand : theme.hairline,
                }}
              >
                <Text style={{ color: active ? "#fff" : theme.ink2, fontSize: 12, fontWeight: "600" }}>
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: theme.muted, fontSize: 11, marginTop: 8 }}>
          Even &quot;aggressive&quot; stays within human-safe posting rates per platform.
        </Text>
      </Card>

      <Card theme={theme}>
        <Text style={{ color: theme.ink, fontWeight: "600", fontSize: 13, marginBottom: 10 }}>
          Last 7 days
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          {stat("posts", report.last7Days.postsPublished)}
          {stat("tasks done", report.last7Days.tasksCompleted)}
        </View>
        <View style={{ flexDirection: "row" }}>
          {stat("new leads", report.last7Days.newLeads)}
          {stat("deals won", report.last7Days.dealsWon)}
        </View>
        <Text style={{ color: theme.muted, fontSize: 11, marginTop: 12 }}>
          Now: {report.pipeline.tasksRunning} tasks running · {report.pipeline.postsScheduled} posts
          scheduled.
        </Text>
      </Card>
    </ScrollView>
  );
}
