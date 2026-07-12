import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { api, demoConversations } from "../api";
import { Card, Pill } from "../components";
import { Theme } from "../theme";

export function InboxScreen({ theme }: { theme: Theme }) {
  const [conversations, setConversations] = useState(demoConversations);

  useEffect(() => {
    api<{ id: string; channel: string; status: string; lead?: { name: string }; messages: { body: string }[] }[]>(
      "/conversations",
    )
      .then((data) =>
        setConversations(
          data.map((c) => ({
            id: c.id,
            channel: c.channel,
            status: c.status,
            name: c.lead?.name ?? "Visitor",
            last: c.messages[0]?.body ?? "",
          })),
        ),
      )
      .catch(() => {});
  }, []);

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <Card theme={theme}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.ink, fontWeight: "600", fontSize: 14 }}>{item.name}</Text>
            <Pill
              theme={theme}
              text={item.status === "AI_HANDLING" ? "✦ Domo" : item.status === "NEEDS_HUMAN" ? "needs you" : "closed"}
              color={item.status === "NEEDS_HUMAN" ? theme.critical : theme.series2}
            />
          </View>
          <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>via {item.channel}</Text>
          <Text numberOfLines={2} style={{ color: theme.ink2, fontSize: 13, marginTop: 6 }}>
            {item.last}
          </Text>
        </Card>
      )}
    />
  );
}
