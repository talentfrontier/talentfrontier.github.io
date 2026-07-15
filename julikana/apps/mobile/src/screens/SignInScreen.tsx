import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { forgotPassword, login, register, resetPassword } from "../api";
import { Theme } from "../theme";

type Mode = "login" | "register" | "forgot" | "reset";

export function SignInScreen({
  theme,
  onSignedIn,
  onSkip,
}: {
  theme: Theme;
  onSignedIn: () => void;
  onSkip: () => void;
}) {
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "register") {
        if (password.length < 10) throw new Error("Password must be at least 10 characters.");
        await register(
          {
            email: email.trim(),
            password,
            name: name.trim() || "Owner",
            organizationName: company.trim() || "My Business",
          },
          remember,
        );
        onSignedIn();
      } else if (mode === "login") {
        await login(email.trim(), password, remember);
        onSignedIn();
      } else if (mode === "forgot") {
        const res = await forgotPassword(email.trim());
        // devToken is only returned in non-prod test setups; prefill it so the
        // flow is testable before an email provider is configured.
        if (res.devToken) setCode(res.devToken.slice(0, 8).toUpperCase());
        setNotice("If that email exists, we sent a reset code. Enter it below.");
        setMode("reset");
      } else if (mode === "reset") {
        if (password.length < 10) throw new Error("New password must be at least 10 characters.");
        await resetPassword(code.trim().toLowerCase(), password, remember);
        onSignedIn();
      }
    } catch (e) {
      setError(errorFor(mode, e));
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

  const subtitle =
    mode === "register"
      ? "Create your workspace"
      : mode === "login"
        ? "Welcome back"
        : mode === "forgot"
          ? "Reset your password"
          : "Enter your reset code";

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
        <Text style={{ color: theme.ink2, fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
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

      {(mode === "register" || mode === "login" || mode === "forgot") && (
        <TextInput
          style={inputStyle}
          placeholder="you@company.com"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      )}

      {mode === "reset" && (
        <TextInput
          style={inputStyle}
          placeholder="Reset code (from your email)"
          placeholderTextColor={theme.muted}
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
      )}

      {(mode === "register" || mode === "login" || mode === "reset") && (
        <TextInput
          style={inputStyle}
          placeholder={
            mode === "login"
              ? "Password"
              : mode === "reset"
                ? "New password (min 10 characters)"
                : "Password (min 10 characters)"
          }
          placeholderTextColor={theme.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      )}

      {/* Keep me signed in — persists the session across app restarts. */}
      {mode !== "forgot" && (
        <Pressable
          onPress={() => setRemember((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: remember ? theme.brand : theme.hairline,
              backgroundColor: remember ? theme.brand : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {remember && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>✓</Text>}
          </View>
          <Text style={{ color: theme.ink2, fontSize: 13 }}>Keep me signed in</Text>
        </Pressable>
      )}

      {notice && <Text style={{ color: theme.ink2, fontSize: 12 }}>{notice}</Text>}
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
          {busy ? "Please wait…" : primaryLabel(mode)}
        </Text>
      </Pressable>

      {/* Secondary links */}
      {mode === "login" && (
        <Pressable
          onPress={() => {
            setMode("forgot");
            setError(null);
            setNotice(null);
          }}
          style={{ alignItems: "center", paddingVertical: 4 }}
        >
          <Text style={{ color: theme.ink2, fontSize: 13 }}>Forgot password?</Text>
        </Pressable>
      )}

      {(mode === "register" || mode === "login") && (
        <Pressable
          onPress={() => {
            setMode(mode === "register" ? "login" : "register");
            setError(null);
            setNotice(null);
          }}
          style={{ alignItems: "center", paddingVertical: 6 }}
        >
          <Text style={{ color: theme.ink2, fontSize: 13 }}>
            {mode === "register"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Text>
        </Pressable>
      )}

      {(mode === "forgot" || mode === "reset") && (
        <Pressable
          onPress={() => {
            setMode("login");
            setError(null);
            setNotice(null);
          }}
          style={{ alignItems: "center", paddingVertical: 6 }}
        >
          <Text style={{ color: theme.ink2, fontSize: 13 }}>← Back to sign in</Text>
        </Pressable>
      )}

      <Pressable onPress={onSkip} style={{ alignItems: "center", paddingVertical: 4 }}>
        <Text style={{ color: theme.muted, fontSize: 13 }}>Explore the demo →</Text>
      </Pressable>
    </View>
  );
}

function primaryLabel(mode: Mode) {
  switch (mode) {
    case "register":
      return "Create account";
    case "login":
      return "Sign in";
    case "forgot":
      return "Send reset code";
    case "reset":
      return "Set new password";
  }
}

function errorFor(mode: Mode, e: unknown) {
  if (e instanceof Error && /\d+ characters/.test(e.message)) return e.message;
  switch (mode) {
    case "register":
      return "Could not create account — that email may already exist, or the API is waking up (try again in ~30s).";
    case "login":
      return "Could not sign in — check your email/password. First request can take ~30s while the server wakes.";
    case "forgot":
      return "Could not send the reset code — the API may be waking up (try again in ~30s).";
    case "reset":
      return "That code is invalid or expired. Request a new one.";
  }
}
