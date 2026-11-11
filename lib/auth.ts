import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { authCookieOptions } from "./hosts";

/**
 * Sign-in sessions (Supabase Auth). The browser only signs in and out; every API route checks
 * the session here, on the server. Data is still read with the server's secret key.
 */
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
export const authConfigured = () => !!(url() && anonKey());

export interface SessionUser {
  id: string;
  email: string;
}

/** Supabase client bound to this request's cookies. Route handlers can refresh the session; pages only read it. */
export async function authClient() {
  const store = await cookies();
  return createServerClient(url(), anonKey(), {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const c of list) store.set(c.name, c.value, c.options);
        } catch {
          /* read-only while a page renders */
        }
      },
    },
  });
}

/** The signed-in user, or null. Skips the network call when there's no session cookie. */
export async function currentUser(): Promise<SessionUser | null> {
  if (!authConfigured()) return null;
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const { data, error } = await (await authClient()).auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}
