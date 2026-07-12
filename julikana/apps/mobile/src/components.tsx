import React from "react";
import { Text, View, ViewStyle } from "react-native";
import { Theme } from "./theme";

export function Card({
  theme,
  style,
  children,
}: {
  theme: Theme;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.hairline,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatTile({
  theme,
  label,
  value,
  delta,
}: {
  theme: Theme;
  label: string;
  value: string;
  delta?: number;
}) {
  return (
    <Card theme={theme} style={{ flex: 1 }}>
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "500" }}>{label}</Text>
      <Text style={{ color: theme.ink, fontSize: 22, fontWeight: "700", marginTop: 4 }}>
        {value}
      </Text>
      {delta !== undefined && (
        <Text style={{ fontSize: 11, marginTop: 2, color: delta >= 0 ? theme.good : theme.critical }}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%{" "}
          <Text style={{ color: theme.muted }}>vs prev 30d</Text>
        </Text>
      )}
    </Card>
  );
}

export function Pill({
  theme,
  text,
  color,
}: {
  theme: Theme;
  text: string;
  color: string;
}) {
  return (
    <View
      style={{
        backgroundColor: color + "22",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ color, fontSize: 10, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}
