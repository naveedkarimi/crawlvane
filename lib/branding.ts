import dns from "node:dns/promises";
import { isPublic, SITE_URL } from "./config";
import { planAllowsFor } from "./entitlements";
import { db } from "./store";
import type { Account } from "./accounts";
import type { ReportOptions } from "./reportTypes";

/**
 * Agency branding: a name, logo and colour put on the team's reports, and an optional domain
 * of their own for report links (reports.agency.com). Both follow the white-label plan feature.
 */
export interface Branding { name: string | null; logoUrl: string | null; color: string | null; domain: string | null; domainVerified: boolean }

export class BrandingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const HEX = /^#[0-9a-f]{6}$/i;
const DOMAIN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const mainHost = () => new URL(SITE_URL).hostname;

export function normalizeDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}

export async function getBranding(orgId: string): Promise<Branding> {
  const { data, error } = await db().from("organizations").select("brand_name, brand_logo, brand_color, report_domain, report_domain_verified_at").eq("id", orgId).maybeSingle();
  if (error) throw new Error(`Database read failed: ${error.message}`);
  return { name: data?.brand_name ?? null, logoUrl: data?.brand_logo ?? null, color: data?.brand_color ?? null, domain: data?.report_domain ?? null, domainVerified: !!data?.report_domain_verified_at };
}

/** Saves the name, logo and colour. Empty values clear them. */
export async function setBranding(a: Account, b: { name?: unknown; logoUrl?: unknown; color?: unknown; domain?: unknown }): Promise<Branding> {
  if (a.role !== "owner") throw new BrandingError("Only team owners can change branding.", 403);
  if (!planAllowsFor(a.org, "whiteLabel")) throw new BrandingError("Report branding is part of the Agency plan.", 402);
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
  const logoUrl = typeof b.logoUrl === "string" ? b.logoUrl.trim().slice(0, 500) : "";
  const color = typeof b.color === "string" ? b.color.trim() : "";
  if (logoUrl && !/^https:\/\/[^\s]+$/.test(logoUrl)) throw new BrandingError("The logo must be an https:// image address.");
  if (color && !HEX.test(color)) throw new BrandingError("The colour must be a hex value like #156064.");
  const update: Record<string, unknown> = { brand_name: name || null, brand_logo: logoUrl || null, brand_color: color || null };
  if (typeof b.domain === "string") {
    const domain = normalizeDomain(b.domain);
    if (domain && !DOMAIN.test(domain)) throw new BrandingError("That doesn't look like a domain. Use something like reports.youragency.com.");
    if (domain && (domain === mainHost() || domain.endsWith(`.${mainHost()}`))) throw new BrandingError("Use a domain your agency owns.");
    const current = await getBranding(a.org.id);
    if (domain !== (current.domain ?? "")) Object.assign(update, { report_domain: domain || null, report_domain_verified_at: null });
  }
  const { error } = await db().from("organizations").update(update).eq("id", a.org.id);
  if (error) {
    if (error.code === "23505") throw new BrandingError("Another team already uses that domain.", 409);
    throw new Error(`Database write failed: ${error.message}`);
  }
  return getBranding(a.org.id);
}

/** Addresses a host name points at (following a CNAME), for comparing with ours. */
async function addressesOf(host: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (const fn of [dns.resolve4, dns.resolve6]) {
    try {
      for (const ip of await fn(host)) out.add(ip);
    } catch {
      // No records of this type.
    }
  }
  return out;
}

/**
 * The domain is verified when it points at the same server as the main site (an A record or a
 * CNAME). That proves the agency controls its DNS, so nobody can claim someone else's domain.
 */
export async function verifyDomain(a: Account): Promise<Branding> {
  if (a.role !== "owner") throw new BrandingError("Only team owners can verify a domain.", 403);
  const b = await getBranding(a.org.id);
  if (!b.domain) throw new BrandingError("Add a domain first.");
  const [theirs, ours] = await Promise.all([addressesOf(b.domain), addressesOf(mainHost())]);
  if (!theirs.size) throw new BrandingError(`${b.domain} doesn't point anywhere yet. Add a CNAME record to ${mainHost()} and try again in a few minutes.`);
  if (![...theirs].some((ip) => ours.has(ip))) throw new BrandingError(`${b.domain} points somewhere else. Add a CNAME record to ${mainHost()}, wait for it to update, then try again.`);
  const { error } = await db().from("organizations").update({ report_domain_verified_at: new Date().toISOString() }).eq("id", a.org.id);
  if (error) throw new Error(`Database write failed: ${error.message}`);
  return { ...b, domainVerified: true };
}

/** The team's branding as report options, or nothing when it isn't set or the plan doesn't include it. */
export function whiteLabelFrom(org: { plan?: string }, b: Branding | null): ReportOptions["whiteLabel"] | undefined {
  if (!b?.name || !isPublic("whiteLabel") || !planAllowsFor(org, "whiteLabel")) return undefined;
  return { name: b.name, logoUrl: b.logoUrl ?? undefined, color: b.color ?? undefined };
}

/** Where a team's report links point: its own verified domain, or the main site. */
export function reportBase(b: Branding | null): string {
  return b?.domain && b.domainVerified && process.env.CUSTOM_REPORT_DOMAINS === "1" ? `https://${b.domain}` : SITE_URL;
}

/** Which team owns this verified report domain. Used to serve only that team's reports there. */
export async function orgForDomain(host: string): Promise<string | null> {
  const { data } = await db().from("organizations").select("id").eq("report_domain", normalizeDomain(host)).not("report_domain_verified_at", "is", null).maybeSingle();
  return data?.id ?? null;
}
