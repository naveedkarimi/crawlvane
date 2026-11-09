/**
 * Newsletter sign-up, straight from the browser to Supabase. Uses the public key and two
 * database functions (see supabase/schema.sql); the table itself stays closed to that key.
 */
const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const publicKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

async function rpc(name: string, args: Record<string, unknown>): Promise<Response> {
  const url = supabaseUrl();
  const key = publicKey();
  if (!url || !key) throw new Error("The newsletter isn't set up yet.");
  return fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: key, ...(key.startsWith("ey") ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(args),
  });
}

export async function subscribeNewsletter(email: string, source?: string): Promise<void> {
  const res = await rpc("subscribe_newsletter", { p_email: email, p_source: source ?? null });
  if (res.ok) return;
  const body = (await res.json().catch(() => null)) as { code?: string } | null;
  throw new Error(body?.code === "22023" ? "Please enter a valid email address." : "We couldn't save that just now. Please try again.");
}

/** True when the email was removed; false for an unknown or already used link. */
export async function unsubscribeNewsletter(token: string): Promise<boolean> {
  const res = await rpc("unsubscribe_newsletter", { p_token: token });
  if (!res.ok) throw new Error("Something went wrong. Please try again.");
  return (await res.json()) === true;
}
