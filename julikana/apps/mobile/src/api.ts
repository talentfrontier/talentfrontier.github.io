/**
 * API client for the Julikana backend. The base URL is baked in at build
 * time via EXPO_PUBLIC_API_URL (set per-profile in eas.json).
 */
const API = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000"; // Android-emulator localhost

let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
}

export function hasToken() {
  return !!accessToken;
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

export async function login(email: string, password: string) {
  const tokens = await api<{ accessToken: string; refreshToken: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setToken(tokens.accessToken);
  return tokens;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}) {
  const tokens = await api<{ accessToken: string; refreshToken: string }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify(input) },
  );
  setToken(tokens.accessToken);
  return tokens;
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
