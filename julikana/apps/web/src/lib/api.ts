"use client";

/**
 * Typed API client. Every call carries the JWT from localStorage; a helper
 * hook falls back to demo data when the backend is unreachable so the UI is
 * fully explorable in preview deployments.
 */
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jk_access");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("jk_access", access);
  localStorage.setItem("jk_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("jk_access");
  localStorage.removeItem("jk_refresh");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

/** Fetch with graceful demo-data fallback. */
export function useData<T>(path: string, fallback: T): { data: T; live: boolean } {
  const [state, setState] = useState<{ data: T; live: boolean }>({
    data: fallback,
    live: false,
  });

  useEffect(() => {
    let cancelled = false;
    api<T>(path)
      .then((data) => !cancelled && setState({ data, live: true }))
      .catch(() => {
        /* keep demo data */
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
