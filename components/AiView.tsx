"use client";

import { useState } from "react";
import { Bot, Eye, Loader2 } from "lucide-react";
import type { AuditFacts } from "@/lib/types";
import { api } from "@/lib/client";

/**
 * "See what AI sees": the page as people see it (a real Chrome screenshot from
 * Google PageSpeed) next to what AI crawlers read from the raw HTML, which most
 * of them fetch without running JavaScript.
 */
export default function AiView({
  facts,
  canScreenshot,
  screenshot: shotProp,
  onLoadScreenshot,
  loadingScreenshot,
  screenshotError,
}: {
  facts: AuditFacts;
  canScreenshot: boolean;
  /** Pass these when the parent already runs PageSpeed (the page check does). */
  screenshot?: string | null;
  onLoadScreenshot?: () => void;
  loadingScreenshot?: boolean;
  screenshotError?: string;
}) {
  const [ownShot, setOwnShot] = useState<string | null>(null);
  const [ownLoading, setOwnLoading] = useState(false);
  const [err, setErr] = useState("");

  const shot = shotProp ?? ownShot;
  const loading = loadingScreenshot ?? ownLoading;
  const loadShot = async () => {
    if (onLoadScreenshot) return onLoadScreenshot();
    setOwnLoading(true);
    setErr("");
    try {
      const r = await api<{ screenshot?: string | null }>(`/api/pagespeed?url=${encodeURIComponent(facts.finalUrl)}`);
      if (r.screenshot) setOwnShot(r.screenshot);
      else setErr("PageSpeed returned no screenshot for this page.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load the screenshot.");
    } finally {
      setOwnLoading(false);
    }
  };

  const words = facts.wordCount;
  const outline = facts.outline ?? [];
  const excerpt = (facts.textExcerpt ?? "").trim();
  const aiBots = facts.bots.filter((b) => b.purpose === "search" || b.purpose === "user-fetch");
  const aiAllowed = aiBots.filter((b) => b.allowed).length;

  const verdict = facts.rendered
    ? { tone: "info", text: "This audit ran JavaScript first, so the text below is what a browser sees. Run it without JavaScript rendering to see what most AI crawlers get." }
    : words < 50
      ? { tone: "bad", text: `AI crawlers get almost nothing: ${words} words of text in the HTML. The content most likely appears only after JavaScript runs.` }
      : words < 250
        ? { tone: "warn", text: `AI crawlers get a thin page: ${words} words of text in the HTML. Add the key facts and answers as plain HTML text.` }
        : { tone: "good", text: `AI crawlers can read your content: ${words} words of text are in the HTML.` };

  return (
    <div className="card aiview">
      <div className="aiview-head">
        <div>
          <h3>What AI sees</h3>
          <p className="muted small">
            Most AI crawlers (GPTBot, ClaudeBot, PerplexityBot and others) read the raw HTML and don&apos;t run JavaScript.
            Left: your page in a real browser. Right: the text those crawlers actually get.
          </p>
        </div>
      </div>

      <div className={`aiview-verdict ${verdict.tone}`}>{verdict.text}</div>

      <div className="aiview-panes">
        <section className="aiview-pane" aria-label="What people see">
          <div className="aiview-label"><Eye size={15} /> What people see</div>
          <div className="aiview-screen">
            {shot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot} alt={`Screenshot of ${facts.finalUrl} in a browser`} />
            ) : canScreenshot ? (
              <div className="aiview-empty">
                <p>Load a real browser screenshot from Google PageSpeed.</p>
                <button type="button" onClick={loadShot} disabled={loading}>
                  {loading ? <><Loader2 size={15} className="spin" /> Loading (about 30 s)</> : "Show what people see"}
                </button>
                {(screenshotError || err) && <p className="c-fail small">{screenshotError || err}</p>}
              </div>
            ) : (
              <div className="aiview-empty"><p>Screenshots need the Core Web Vitals feature.</p></div>
            )}
          </div>
        </section>

        <section className="aiview-pane" aria-label="What AI crawlers read">
          <div className="aiview-label"><Bot size={15} /> What AI crawlers read</div>
          <div className="aiview-doc">
            <dl>
              <dt>Title</dt>
              <dd>{facts.title || <em>none</em>}</dd>
              <dt>Description</dt>
              <dd>{facts.metaDescription || <em>none</em>}</dd>
              <dt>Headings</dt>
              <dd>
                {outline.length ? (
                  <ul className="aiview-outline">
                    {outline.map((h, i) => (
                      <li key={i} style={{ paddingLeft: `${(Math.min(h.level, 4) - 1) * 14}px` }}>
                        <span className="mono">H{h.level}</span> {h.text || <em>empty</em>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <em>none</em>
                )}
              </dd>
              <dt>Text</dt>
              <dd className="aiview-text">
                {excerpt ? <>{excerpt}{excerpt.length >= 900 ? "…" : ""}</> : <em>empty: there is no readable text in the HTML</em>}
              </dd>
            </dl>
          </div>
          <div className="aiview-stats">
            <span className={words < 50 ? "c-fail" : words < 250 ? "c-warn" : "c-pass"}>{words} words</span>
            <span>{outline.length} headings</span>
            <span>{facts.schemaTypes.length ? `Schema: ${facts.schemaTypes.slice(0, 4).join(", ")}` : "No schema"}</span>
            <span className={aiAllowed < aiBots.length ? "c-warn" : ""}>AI search bots allowed: {aiAllowed}/{aiBots.length}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
