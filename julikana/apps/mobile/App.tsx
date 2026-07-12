import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Pressable, SafeAreaView, Text, View, useColorScheme } from "react-native";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { DomoScreen } from "./src/screens/DomoScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { LeadsScreen } from "./src/screens/LeadsScreen";
import { SignInScreen } from "./src/screens/SignInScreen";
import { useTheme } from "./src/theme";

const TABS = [
  { key: "domo", label: "Domo", icon: "✦" },
  { key: "dashboard", label: "Overview", icon: "▦" },
  { key: "leads", label: "Leads", icon: "◎" },
  { key: "inbox", label: "Inbox", icon: "◇" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function App() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>("domo");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.plane }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {!authed ? (
        <SignInScreen
          theme={theme}
          onSignedIn={() => setAuthed(true)}
          onSkip={() => setAuthed(true)}
        />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: theme.hairline,
            }}
          >
            <Text style={{ color: theme.ink, fontSize: 17, fontWeight: "700" }}>
              {TABS.find((t) => t.key === tab)?.label}
            </Text>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: theme.brand,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>J</Text>
            </View>
          </View>

          <View style={{ flex: 1 }}>
            {tab === "domo" && <DomoScreen theme={theme} />}
            {tab === "dashboard" && <DashboardScreen theme={theme} />}
            {tab === "leads" && <LeadsScreen theme={theme} />}
            {tab === "inbox" && <InboxScreen theme={theme} />}
          </View>

          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderColor: theme.hairline,
              backgroundColor: theme.surface,
            }}
          >
            {TABS.map((item) => {
              const active = item.key === tab;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}
                >
                  <Text style={{ fontSize: 16, color: active ? theme.brand : theme.muted }}>
                    {item.icon}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      marginTop: 2,
                      fontWeight: active ? "700" : "400",
                      color: active ? theme.brand : theme.muted,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
