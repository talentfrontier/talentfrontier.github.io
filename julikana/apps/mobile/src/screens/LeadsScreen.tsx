import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { api, demoLeads } from "../api";
import { Card, Pill } from "../components";
import { Theme } from "../theme";

export function LeadsScreen({ theme }: { theme: Theme }) {
  const [leads, setLeads] = useState(demoLeads);

  useEffect(() => {
    api<{ items: typeof demoLeads }>("/leads")
      .then((data) => setLeads(data.items))
      .catch(() => {});
  }, []);

  return (
    <FlatList
      data={leads}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <Card theme={theme} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.ink, fontWeight: "600", fontSize: 14 }}>{item.name}</Text>
            <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>
              via {item.source} · score {item.score}
            </Text>
            <View style={{ height: 4, backgroundColor: theme.hairline, borderRadius: 2, marginTop: 8 }}>
              <View
                style={{
                  height: 4,
                  width: `${item.score}%`,
                  backgroundColor: theme.brand,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
          <Pill theme={theme} text={item.stage.replace(/_/g, " ").toLowerCase()} color={theme.brand} />
        </Card>
      )}
    />
  );
}
