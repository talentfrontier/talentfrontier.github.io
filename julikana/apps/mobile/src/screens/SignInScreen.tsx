import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { login, register } from "../api";
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
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") {
        if (password.length < 10) throw new Error("Password must be at least 10 characters.");
        await register({
          email: email.trim(),
          password,
          name: name.trim() || "Owner",
          organizationName: company.trim() || "My Business",
        });
      } else {
        await login(email.trim(), password);
      }
      onSignedIn();
    } catch (e) {
      setError(
        e instanceof Error && /10 characters/.test(e.message)
          ? e.message
          : mode === "register"
            ? "Could not create account — that email may already exist, or the API is waking up (try again in ~30s)."
            : "Could not sign in — check your email/password. First request can take ~30s while the server wakes.",
      );
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
          {mode === "register" ? "Create your workspace" : "Welcome back"}
        </Text>
      </View>

      {mode === "register" && (
        <>
          <TextInput
            style={inputStyle}
            placeholder="Your name"
            placeholderTextColor={theme.muted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={inputStyle}
            placeholder="Business / company name"
            placeholderTextColor={theme.muted}
            value={company}
            onChangeText={setCompany}
          />
        </>
      )}
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
        placeholder={mode === "register" ? "Password (min 10 characters)" : "Password"}
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
          {busy
            ? mode === "register"
              ? "Creating…"
              : "Signing in…"
            : mode === "register"
              ? "Create account"
              : "Sign in"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          setMode(mode === "register" ? "login" : "register");
          setError(null);
        }}
        style={{ alignItems: "center", paddingVertical: 6 }}
      >
        <Text style={{ color: theme.ink2, fontSize: 13 }}>
          {mode === "register" ? "Already have an account? Sign in" : "New here? Create an account"}
        </Text>
      </Pressable>

      <Pressable onPress={onSkip} style={{ alignItems: "center", paddingVertical: 4 }}>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Explore the demo →</Text>
      </Pressable>
    </View>
  );
}
