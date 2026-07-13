import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api";
import { Theme } from "../theme";

interface Turn {
  id: string;
  role: "user" | "domo";
  text: string;
  tasks?: { agent: string; title: string }[];
}

const EXAMPLES = ["Promote my new laptop", "Make a TikTok for the weekend offer", "Performance report"];

export function DomoScreen({ theme }: { theme: Theme }) {
  const [turns, setTurns] = useState<Turn[]>([
    {
      id: "0",
      role: "domo",
      text: "Hi, I'm Domo — your marketing department in your pocket. Give me a job and I'll plan it, delegate to my specialist agents, and report back.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Turn>>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setTurns((t) => [...t, { id: String(Date.now()), role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api<{ understanding: string; tasks: { agent: string; title: string }[] }>(
        "/ai/instruct",
        { method: "POST", body: JSON.stringify({ instruction: text }) },
      );
      setTurns((t) => [
        ...t,
        { id: String(Date.now() + 1), role: "domo", text: `On it. ${res.understanding}`, tasks: res.tasks },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        {
          id: String(Date.now() + 1),
          role: "domo",
          text: "I couldn't reach your workspace (demo mode). Once the app is pointed at your Julikana API and you're signed in, I'll plan this and put my agents to work.",
          tasks: [
            { agent: "CONTENT_CREATOR", title: "Create platform-tailored posts" },
            { agent: "SOCIAL_MEDIA_MANAGER", title: "Schedule at best times" },
          ],
        },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={list}
        data={turns}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              backgroundColor: item.role === "user" ? theme.brand : theme.surface,
              borderWidth: item.role === "user" ? 0 : 1,
              borderColor: theme.hairline,
              borderRadius: 16,
              padding: 12,
            }}
          >
            <Text style={{ color: item.role === "user" ? "#fff" : theme.ink, fontSize: 14, lineHeight: 20 }}>
              {item.text}
            </Text>
            {item.tasks?.map((task, i) => (
              <Text key={i} style={{ color: theme.ink2, fontSize: 12, marginTop: i === 0 ? 8 : 3 }}>
                • {task.agent.replace(/_/g, " ").toLowerCase()} — {task.title}
              </Text>
            ))}
          </View>
        )}
      />
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingBottom: 6, flexWrap: "wrap" }}>
        {EXAMPLES.map((ex) => (
          <Pressable
            key={ex}
            onPress={() => send(ex)}
            style={{
              borderWidth: 1,
              borderColor: theme.hairline,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: theme.ink2, fontSize: 11 }}>{ex}</Text>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 12,
          borderTopWidth: 1,
          borderColor: theme.hairline,
          backgroundColor: theme.surface,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder='Try: "Promote my new laptop"'
          placeholderTextColor={theme.muted}
          style={{
            flex: 1,
            color: theme.ink,
            backgroundColor: theme.plane,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
          }}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => send(input)}
          disabled={busy}
          style={{
            backgroundColor: theme.brand,
            borderRadius: 10,
            paddingHorizontal: 16,
            justifyContent: "center",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
            {busy ? "…" : "Send"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
