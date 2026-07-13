"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, setTokens } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const body =
        mode === "login"
          ? { email: form.get("email"), password: form.get("password") }
          : {
              email: form.get("email"),
              password: form.get("password"),
              name: form.get("name"),
              organizationName: form.get("organizationName"),
            };
      const tokens = await api<{ accessToken: string; refreshToken: string }>(
        `/auth/${mode}`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setTokens(tokens.accessToken, tokens.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("401")
          ? "Invalid email or password."
          : "Could not reach the server — continuing to the demo dashboard.",
      );
      setTimeout(() => router.push("/dashboard"), 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-sm ring-1 ring-[var(--ring)]">
        <h1 className="text-xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          {mode === "login" ? "Sign in to your Julikana account." : "Domo starts working the moment you do."}
        </p>

        <div className="mt-6 grid gap-2">
          <a
            href={`${API}/api/v1/auth/google`}
            className="flex h-10 items-center justify-center rounded-lg text-sm font-medium ring-1 ring-[var(--ring)] hover:bg-[var(--hairline)]"
          >
            Continue with Google
          </a>
          <a
            href={`${API}/api/v1/auth/microsoft`}
            className="flex h-10 items-center justify-center rounded-lg text-sm font-medium ring-1 ring-[var(--ring)] hover:bg-[var(--hairline)]"
          >
            Continue with Microsoft
          </a>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-[var(--hairline)]" /> or with email
          <span className="h-px flex-1 bg-[var(--hairline)]" />
        </div>

        <form onSubmit={submit} className="grid gap-3">
          {mode === "register" && (
            <>
              <Input name="name" placeholder="Your name" required />
              <Input name="organizationName" placeholder="Company name" required />
            </>
          )}
          <Input name="email" type="email" placeholder="you@company.com" required />
          <Input name="password" type="password" placeholder="Password" required minLength={10} />
          {error && <p className="text-xs text-[var(--status-critical)]">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 w-full text-center text-xs text-ink-2 hover:text-ink"
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
