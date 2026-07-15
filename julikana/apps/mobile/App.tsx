import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useColorScheme } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { bootstrapAuth, logout } from "./src/api";
import { AutopilotScreen } from "./src/screens/AutopilotScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { DomoScreen } from "./src/screens/DomoScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { LeadsScreen } from "./src/screens/LeadsScreen";
import { SignInScreen } from "./src/screens/SignInScreen";
import { StudioScreen } from "./src/screens/StudioScreen";
import { Theme, useTheme } from "./src/theme";

const TABS = [
  { key: "domo", label: "Domo", icon: "✦" },
  { key: "studio", label: "Studio", icon: "▶" },
  { key: "autopilot", label: "Autopilot", icon: "◐" },
  { key: "dashboard", label: "Overview", icon: "▦" },
  { key: "leads", label: "Leads", icon: "◎" },
  { key: "inbox", label: "Inbox", icon: "◇" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<TabKey>("domo");

  // Try to restore a "keep me signed in" session on launch.
  useEffect(() => {
    bootstrapAuth()
      .then((ok) => setAuthed(ok))
      .finally(() => setBooting(false));
  }, []);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.plane }}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.plane }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {!authed ? (
        // Pad the top so the sign-in form clears the status bar / notch.
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <SignInScreen
            theme={theme}
            onSignedIn={() => setAuthed(true)}
            onSkip={() => setAuthed(true)}
          />
        </View>
      ) : (
        <>
          {/* Header respects the top inset (status bar / camera notch). */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingTop: insets.top + 12,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderColor: theme.hairline,
            }}
          >
            <Text style={{ color: theme.ink, fontSize: 17, fontWeight: "700" }}>
              {TABS.find((t) => t.key === tab)?.label}
            </Text>
            {/* Tap the badge to sign out. */}
            <Pressable
              onPress={async () => {
                await logout();
                setAuthed(false);
                setTab("domo");
              }}
              hitSlop={8}
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
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            {tab === "domo" && <DomoScreen theme={theme} />}
            {tab === "studio" && <StudioScreen theme={theme} />}
            {tab === "autopilot" && <AutopilotScreen theme={theme} />}
            {tab === "dashboard" && <DashboardScreen theme={theme} />}
            {tab === "leads" && <LeadsScreen theme={theme} />}
            {tab === "inbox" && <InboxScreen theme={theme} />}
          </View>

          <TabBar theme={theme} tab={tab} onSelect={setTab} bottomInset={insets.bottom} />
        </>
      )}
    </View>
  );
}

/**
 * Bottom tab bar. `paddingBottom` includes the device's bottom safe-area inset
 * so the buttons always sit ABOVE the Android gesture bar / nav buttons (and
 * the iOS home indicator) instead of overlapping them.
 */
function TabBar({
  theme,
  tab,
  onSelect,
  bottomInset,
}: {
  theme: Theme;
  tab: TabKey;
  onSelect: (t: TabKey) => void;
  bottomInset: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderColor: theme.hairline,
        backgroundColor: theme.surface,
        paddingTop: 8,
        paddingBottom: Math.max(bottomInset, 8),
      }}
    >
      {TABS.map((item) => {
        const active = item.key === tab;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
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
  );
}
