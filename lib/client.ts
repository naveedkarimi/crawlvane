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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
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
