import crypto from "node:crypto";
import { runAudit } from "./audit";
import { readJson, writeJson } from "./store";
import { BRAND } from "./brand";

/**
 * "Crawlvane score" badge sites can embed. Each site's score is cached for a day in
 * data/badges/, so a busy page showing the badge doesn't trigger an audit per view.
 */
const DAY = 86400_000;
export interface BadgeData { host: string; score: number; at: string }

export function badgeHost(raw: string): string {
  const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
  return u.hostname.toLowerCase().replace(/^www\./, "");
}
const keyFor = (host: string) => crypto.createHash("sha1").update(host).digest("hex").slice(0, 24);

export async function cachedBadge(host: string): Promise<BadgeData | null> {
  const d = await readJson<BadgeData>("badges", keyFor(host));
  return d && Date.now() - Date.parse(d.at) < DAY ? d : null;
}

export async function freshBadge(host: string): Promise<BadgeData> {
  const r = await runAudit(`https://${host}/`);
  const d = { host, score: r.scores.overall, at: new Date().toISOString() };
  await writeJson("badges", keyFor(host), d);
  return d;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Flat two-part badge in the brand colours: label on teal, score on a status colour. */
export function badgeSvg(score: number | null, label = `${BRAND.name} score`): string {
  const value = score === null ? "n/a" : `${score}/100`;
  const color = score === null ? "#5a7372" : score >= 85 ? "#00765d" : score >= 60 ? "#9a6b00" : "#b42318";
  const w = (t: string) => Math.round(t.length * 6.6 + 16);
  const lw = w(label);
  const vw = w(value);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + vw}" height="22" role="img" aria-label="${esc(label)}: ${esc(value)}">
<title>${esc(label)}: ${esc(value)}</title>
<clipPath id="r"><rect width="${lw + vw}" height="22" rx="5"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="22" fill="#156064"/><rect x="${lw}" width="${vw}" height="22" fill="${color}"/></g>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${lw / 2}" y="15">${esc(label)}</text><text x="${lw + vw / 2}" y="15" font-weight="bold">${esc(value)}</text></g>
</svg>`;
}
