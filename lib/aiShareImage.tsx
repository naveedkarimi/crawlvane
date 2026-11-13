import { ImageResponse } from "next/og";
import { aiViewVerdict, answerBots } from "./aiView";
import { BRAND } from "./brand";
import type { AuditFacts } from "./types";

/** The "What AI sees" share image (1200×630): what people see next to what AI crawlers get. */
const TONE = { good: "#3c9a3e", warn: "#e58a00", bad: "#d7372a", info: "#8bb2dc" } as const;
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function aiShareImage(facts: AuditFacts): { image: ImageResponse; host: string } {
  const host = (() => { try { return new URL(facts.finalUrl).host.replace(/^www\./, ""); } catch { return facts.finalUrl; } })();
  const verdict = aiViewVerdict(facts);
  const bots = answerBots(facts);
  const allowed = bots.filter((b) => b.allowed).length;
  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "56px 64px", background: "#122e49", color: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>What AI sees on {cut(host, 34)}</div>
          <div style={{ display: "flex", fontSize: 22, color: "#bbcadb" }}>{BRAND.name}</div>
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: 40, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 32, borderRadius: 24, background: "#ffffff", color: "#122e49" }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#56677a", textTransform: "uppercase", letterSpacing: 2 }}>People see</div>
            <div style={{ display: "flex", marginTop: 20, fontSize: 34, fontWeight: 700, lineHeight: 1.2 }}>{cut(facts.title || host, 70)}</div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 22, color: "#3e4f62", lineHeight: 1.4 }}>{cut(facts.metaDescription || "", 150)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 32, borderRadius: 24, background: "#0b1e31", border: "2px solid #2a5378" }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#8bb2dc", textTransform: "uppercase", letterSpacing: 2 }}>AI crawlers get</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 16 }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: TONE[verdict.tone], letterSpacing: -3 }}>{facts.wordCount.toLocaleString("en-US")}</div>
              <div style={{ display: "flex", fontSize: 28, color: "#d9e6f3" }}>words of text</div>
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 22, color: "#d9e6f3", lineHeight: 1.4 }}>{cut(verdict.text, 170)}</div>
            {bots.length > 0 && <div style={{ display: "flex", marginTop: "auto", fontSize: 22, color: "#bbcadb" }}>{allowed} of {bots.length} AI crawlers allowed in robots.txt</div>}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 22, color: "#8bb2dc" }}>Check your own site free at {BRAND.host}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  return { image, host };
}
