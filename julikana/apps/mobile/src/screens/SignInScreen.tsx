import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { login } from "../api";
import { Theme } from "../theme";

export function SignInScreen({
  theme,
  onSignedIn,
  onSkip,
}: {
  theme: Theme;
  onSignedIn: () => void;
  onSkip: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      onSignedIn();
    } catch {
      setError("Could not sign in — check credentials and API URL.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    color: theme.ink,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.hairline,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  } as const;

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            backgroundColor: theme.brand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>J</Text>
        </View>
        <Text style={{ color: theme.ink, fontSize: 22, fontWeight: "700", marginTop: 12 }}>
          Julikana
        </Text>
        <Text style={{ color: theme.ink2, fontSize: 13, marginTop: 4 }}>
          Domo, your AI marketing employee
        </Text>
      </View>

      <TextInput
        style={inputStyle}
        placeholder="you@company.com"
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={inputStyle}
        placeholder="Password"
        placeholderTextColor={theme.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={{ color: theme.critical, fontSize: 12 }}>{error}</Text>}

      <Pressable
        onPress={submit}
        disabled={busy}
        style={{
          backgroundColor: theme.brand,
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: "center",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
          {busy ? "Signing in…" : "Sign in"}
        </Text>
      </Pressable>

      <Pressable onPress={onSkip} style={{ alignItems: "center", paddingVertical: 10 }}>
        <Text style={{ color: theme.ink2, fontSize: 13 }}>Explore the demo →</Text>
      </Pressable>
    </View>
  );
}
