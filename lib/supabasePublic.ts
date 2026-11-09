/**
 * Forms that go straight from the browser to Supabase. Uses the public key and database
 * functions (see supabase/schema.sql); the tables themselves stay closed to that key.
 */
const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const publicKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

async function rpc(name: string, args: Record<string, unknown>): Promise<Response> {
  const url = supabaseUrl();
  const key = publicKey();
  if (!url || !key) throw new Error("This form isn't set up yet.");
  return fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: key, ...(key.startsWith("ey") ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(args),
  });
}

/** 22023 is the error the database functions raise, with a message written for the visitor. */
async function saved(res: Response): Promise<void> {
  if (res.ok) return;
  const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
  throw new Error(body?.code === "22023" && body.message ? body.message : "We couldn't save that just now. Please try again.");
}

export async function subscribeNewsletter(email: string, source?: string): Promise<void> {
  await saved(await rpc("subscribe_newsletter", { p_email: email, p_source: source ?? null }));
}

export interface LeadInput {
  kind: "waitlist" | "fix" | "contact";
  email: string;
  name?: string;
  url?: string;
  message?: string;
  source?: string;
}

export async function submitLead(lead: LeadInput): Promise<void> {
  await saved(
    await rpc("submit_lead", {
      p_kind: lead.kind,
      p_email: lead.email,
      p_name: lead.name ?? null,
      p_url: lead.url ?? null,
      p_message: lead.message ?? null,
      p_source: lead.source ?? null,
    }),
  );
}

/** True when the email was removed; false for an unknown or already used link. */
export async function unsubscribeNewsletter(token: string): Promise<boolean> {
  const res = await rpc("unsubscribe_newsletter", { p_token: token });
  if (!res.ok) throw new Error("Something went wrong. Please try again.");
  return (await res.json()) === true;
}
