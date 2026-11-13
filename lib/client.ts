"use client";

import { useEffect, useState } from "react";

const ADMIN_KEY = "nk_admin_key";

/** Read ?admin=KEY once and keep it in localStorage for admin previews of hidden features. */
export function adminKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const p = new URLSearchParams(window.location.search).get("admin");
    if (p === "off") {
      localStorage.removeItem(ADMIN_KEY);
      return "";
    }
    if (p) localStorage.setItem(ADMIN_KEY, p);
    return localStorage.getItem(ADMIN_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const k = adminKey();
  if (k) headers.set("x-admin-key", k);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(path, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as { error?: string; upgrade?: boolean; signup?: boolean };
  if (!res.ok) {
    const err = new ApiError(data.error || `Request failed (${res.status})`, res.status, !!data.upgrade || res.status === 402, !!data.signup);
    // Lets the page show "create a free account" or "see plans" right where the limit was hit.
    if ((err.signup || err.upgrade) && typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("cv:upsell", { detail: { kind: err.signup ? "signup" : "upgrade", message: err.message } }));
    throw err;
  }
  return data as T;
}

/** An API error that says whether signing up or upgrading would fix it. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public upgrade = false, public signup = false) {
    super(message);
  }
}

/** Asks the page to show a sign-up or upgrade prompt, for limits found in the browser. */
export function askToUpgrade(kind: "signup" | "upgrade", message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("cv:upsell", { detail: { kind, message } }));
}

export interface FeatureState {
  key: string;
  name: string;
  description: string;
  tier: "live" | "advanced";
  plan: "free" | "pro" | "agency";
  public: boolean;
  enabled: boolean;
  requires?: string[];
}
export interface AppConfig {
  admin: boolean;
  paywall: boolean;
  accounts: boolean;
  signupGate: boolean;
  fixPreview: number;
  account: { plan: string; role: string } | null;
  /** Price label for one full report bought before signing in, or null when it isn't on sale. */
  guestReport?: string | null;
  features: FeatureState[];
  engines: string[];
  aiConfigured: boolean;
  limits: { maxPagesDefault: number; maxPagesHard: number; maxCompetitors: number };
}

export function useConfig() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  useEffect(() => {
    api<AppConfig>("/api/config").then(setCfg).catch(() => setCfg(null));
  }, []);
  const on = (k: string) => !!cfg?.features.find((f) => f.key === k)?.enabled;
  return { cfg, on };
}

export function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
