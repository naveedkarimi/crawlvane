/**
 * Referrer hosts of AI assistants, for a GA4 "AI assistants" channel or exploration filter.
 * GA4 records the referring host as the session source (for example "chatgpt.com").
 */
export interface AiSource { name: string; hosts: string[]; note?: string; default: boolean }

export const AI_SOURCES: AiSource[] = [
  { name: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"], default: true },
  { name: "Perplexity", hosts: ["perplexity.ai"], default: true },
  { name: "Claude", hosts: ["claude.ai"], default: true },
  { name: "Gemini", hosts: ["gemini.google.com", "bard.google.com"], default: true },
  { name: "Microsoft Copilot", hosts: ["copilot.microsoft.com", "copilot.cloud.microsoft"], default: true },
  { name: "DeepSeek", hosts: ["chat.deepseek.com"], default: true },
  { name: "Grok", hosts: ["grok.com"], default: true },
  { name: "Meta AI", hosts: ["meta.ai"], default: true },
  { name: "Mistral Le Chat", hosts: ["chat.mistral.ai"], default: true },
  { name: "You.com", hosts: ["you.com"], default: false },
  { name: "Phind", hosts: ["phind.com"], default: false },
  { name: "Poe", hosts: ["poe.com"], default: false },
  { name: "Kagi Assistant", hosts: ["kagi.com"], note: "Also a search engine, so it counts some ordinary search visits.", default: false },
  { name: "Duck.ai", hosts: ["duck.ai"], default: false },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches the host and any subdomain, e.g. "chatgpt.com" and "www.chatgpt.com". */
export function buildAiRegex(hosts: string[]): string {
  const list = [...new Set(hosts.map((h) => h.trim().toLowerCase()).filter(Boolean))];
  if (!list.length) return "";
  return `^(.*\\.)?(${list.map(esc).join("|")})$`;
}

/** Test a referrer URL or a GA4 session source against the regex. */
export function matchesAi(regex: string, input: string): boolean {
  if (!regex) return false;
  let host = input.trim().toLowerCase();
  try {
    if (host.includes("://")) host = new URL(host).hostname;
  } catch {
    /* use as typed */
  }
  return new RegExp(regex, "i").test(host.replace(/\/.*$/, ""));
}
