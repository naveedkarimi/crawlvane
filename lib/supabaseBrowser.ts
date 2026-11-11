"use client";

import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions } from "./hosts";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Browser client for signing in and out only. All data goes through the API routes. */
let client: SupabaseClient | null = null;
export function browserAuth(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  client ??= createBrowserClient(url, key, { cookieOptions: authCookieOptions() });
  return client;
}
