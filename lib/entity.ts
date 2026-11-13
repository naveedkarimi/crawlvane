import { USER_AGENT } from "./safeFetch";

/**
 * Entity check: is the business on Wikidata, with this site as its official website (property P856)?
 * AI assistants and search engines use Wikidata to tell businesses with similar names apart, and a
 * schema `sameAs` link to the item ties the site to it. Only the domain is sent to Wikidata.
 * Wikidata has a notability policy, so the advice never suggests adding an item just for SEO.
 */
const API = "https://www.wikidata.org/w/api.php";

export interface EntityCheck {
  checked: boolean;
  item: { id: string; label: string; description: string; url: string } | null;
  /** The site's schema sameAs already links to the Wikidata item. */
  linkedInSchema: boolean;
  /** Other items that also list this site as their official website (possible duplicates). */
  others: number;
}

/** The ways an official website is usually written on Wikidata. */
export function websiteVariants(domain: string): string[] {
  const bare = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return ["https://", "http://"].flatMap((p) => ["", "www."].flatMap((w) => [`${p}${w}${bare}`, `${p}${w}${bare}/`]));
}

/** CirrusSearch query: items whose P856 matches any variant. */
export const searchQuery = (domain: string) => `haswbstatement:${websiteVariants(domain).map((v) => `P856=${v}`).join("|")}`;

async function get<T>(params: Record<string, string>): Promise<T> {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ ...params, format: "json", origin: "*" })) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Wikidata answered ${res.status}`);
  return (await res.json()) as T;
}

export function sameAsLinks(sameAs: string[], id: string): boolean {
  return sameAs.some((s) => new RegExp(`wikidata\\.org/(wiki|entity)/${id}(\\b|$)`, "i").test(s));
}

export async function checkEntity(domain: string, sameAs: string[]): Promise<EntityCheck> {
  try {
    const found = await get<{ query?: { search?: { title: string }[] } }>({ action: "query", list: "search", srsearch: searchQuery(domain), srlimit: "5", srnamespace: "0" });
    const ids = (found.query?.search ?? []).map((s) => s.title).filter((t) => /^Q\d+$/.test(t));
    if (!ids.length) return { checked: true, item: null, linkedInSchema: false, others: 0 };
    const id = ids[0];
    const ent = await get<{ entities?: Record<string, { labels?: { en?: { value: string } }; descriptions?: { en?: { value: string } } }> }>({ action: "wbgetentities", ids: id, props: "labels|descriptions", languages: "en" });
    const e = ent.entities?.[id];
    return {
      checked: true,
      item: { id, label: e?.labels?.en?.value ?? id, description: e?.descriptions?.en?.value ?? "", url: `https://www.wikidata.org/wiki/${id}` },
      linkedInSchema: sameAsLinks(sameAs, id),
      others: ids.length - 1,
    };
  } catch {
    return { checked: false, item: null, linkedInSchema: false, others: 0 };
  }
}
