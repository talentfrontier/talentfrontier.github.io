/**
 * API client for the Julikana backend. The base URL is baked in at build
 * time via EXPO_PUBLIC_API_URL (set per-profile in eas.json).
 */
import * as SecureStore from "expo-secure-store";

export const API = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000"; // Android-emulator localhost

const REFRESH_KEY = "julikana.refreshToken";

let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
}

export function hasToken() {
  return !!accessToken;
}

/** Persist the refresh token so "keep me signed in" survives app restarts. */
async function persistSession(refreshToken: string, remember: boolean) {
  if (remember) {
    try {
      await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    } catch {
      /* SecureStore unavailable (e.g. web preview) — stay in-memory only. */
    }
  }
}

/** Clear the stored session (sign out). */
export async function logout() {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * On app launch: if a refresh token was stored, exchange it for a fresh access
 * token so the user lands straight in the app. Returns true when signed in.
 */
export async function bootstrapAuth(): Promise<boolean> {
  let stored: string | null = null;
  try {
    stored = await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return false;
  }
  if (!stored) return false;
  try {
    const tokens = await api<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: stored }),
    });
    setToken(tokens.accessToken);
    await persistSession(tokens.refreshToken, true);
    return true;
  } catch {
    await logout(); // stored token expired/invalid
    return false;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function login(email: string, password: string, remember = true) {
  const tokens = await api<{ accessToken: string; refreshToken: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setToken(tokens.accessToken);
  await persistSession(tokens.refreshToken, remember);
  return tokens;
}

export async function register(
  input: { email: string; password: string; name: string; organizationName: string },
  remember = true,
) {
  const tokens = await api<{ accessToken: string; refreshToken: string }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify(input) },
  );
  setToken(tokens.accessToken);
  await persistSession(tokens.refreshToken, remember);
  return tokens;
}

/** Ask the server to email a password-reset code. Always resolves ok. */
export async function forgotPassword(email: string) {
  return api<{ ok: boolean; devToken?: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Complete a reset with the emailed code + new password (signs you in). */
export async function resetPassword(token: string, password: string, remember = true) {
  const tokens = await api<{ accessToken: string; refreshToken: string }>(
    "/auth/reset-password",
    { method: "POST", body: JSON.stringify({ token, password }) },
  );
  setToken(tokens.accessToken);
  await persistSession(tokens.refreshToken, remember);
  return tokens;
}

/* ── Studio: video generation ────────────────────────────────────── */

export interface VideoStatus {
  contentItemId: string;
  status: "GENERATING" | "READY" | "FAILED";
  title: string;
  caption: string | null;
  playbackUrl: string | null;
  error: string | null;
}

export async function generateVideo(input: {
  prompt: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  provider?: string;
}) {
  return api<{ contentItemId: string; provider: string; status: string }>("/media/video", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function videoStatus(contentItemId: string) {
  return api<VideoStatus>(`/media/video/${contentItemId}`);
}

/**
 * Build a video source for expo-video from a playbackUrl (a relative
 * /api/v1/... path). The proxy is auth-guarded, so the access token is passed
 * as a header.
 */
export function videoSource(playbackUrl: string) {
  const uri = playbackUrl.startsWith("http") ? playbackUrl : `${API}${playbackUrl}`;
  return { uri, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined };
}

/* ── Demo fallbacks (offline / preview mode) ─────────────────────── */

export const demoSummary = {
  revenueCents: 1_284_500,
  leads: 214,
  leadsDelta: 18,
  conversations: 389,
  scheduledPosts: 12,
  aiTasksRunning: 3,
  aiTasksCompleted: 47,
  engagementRate: 4.7,
};

export const demoLeads = [
  { id: "1", name: "Amina Yusuf", source: "whatsapp", score: 86, stage: "QUALIFIED" },
  { id: "2", name: "John Mwangi", source: "facebook", score: 72, stage: "INTERESTED" },
  { id: "3", name: "Grace Njeri", source: "instagram", score: 64, stage: "CONTACTED" },
  { id: "4", name: "Peter Otieno", source: "landing page", score: 45, stage: "NEW_LEAD" },
  { id: "5", name: "Mary Wanjiru", source: "tiktok", score: 91, stage: "APPOINTMENT" },
];

export const demoConversations = [
  { id: "c1", channel: "whatsapp", status: "AI_HANDLING", name: "Amina Yusuf", last: "Perfect — Domo booked your viewing for Saturday 10am." },
  { id: "c2", channel: "messenger", status: "NEEDS_HUMAN", name: "John Mwangi", last: "I'd like to speak to a manager about bulk pricing." },
  { id: "c3", channel: "instagram", status: "AI_HANDLING", name: "Grace Njeri", last: "Yes! We have the 3-bedroom available from August." },
];
