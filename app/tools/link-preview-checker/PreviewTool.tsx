"use client";

import { useState } from "react";
import UrlForm from "@/components/UrlForm";
import CheckList from "@/components/CheckList";
import { usePageTool } from "@/components/usePageTool";
import type { LinkPreview } from "@/lib/gen/pageTools";

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function Img({ src, className }: { src: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`${className} lp-noimg`}>No image</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export default function PreviewTool() {
  const { data: p, loading, error, run } = usePageTool<LinkPreview>("preview");
  const path = p ? (() => { try { const u = new URL(p.url); return u.pathname === "/" ? "" : u.pathname.split("/").filter(Boolean).join(" › "); } catch { return ""; } })() : "";

  return (
    <div className="tool">
      <UrlForm id="preview-url" button="Check preview" loading={loading} onSubmit={run} />
      {error && <p className="tool-error" role="alert">{error}</p>}
      {p && (
        <div className="tool-result">
          <div className="lp-grid">
            <section className="card lp-card" aria-label="Google search result">
              <div className="lp-label">Google search</div>
              <div className="lp-google">
                <div className="lp-g-site">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.favicon} alt="" width={18} height={18} referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  <div><div>{p.siteName || p.host}</div><div className="lp-g-url">https://{p.host}{path ? ` › ${path}` : ""}</div></div>
                </div>
                <div className="lp-g-title">{cut(p.title || p.host, 60)}</div>
                <div className="lp-g-desc">{cut(p.description || "Google will pick text from the page.", 158)}</div>
              </div>
            </section>

            <section className="card lp-card" aria-label="LinkedIn and Facebook">
              <div className="lp-label">LinkedIn · Facebook · Slack</div>
              <div className="lp-social">
                <Img src={p.image} className="lp-img" />
                <div className="lp-body">
                  <div className="lp-host">{p.host.toUpperCase()}</div>
                  <div className="lp-title">{cut(p.title || p.host, 88)}</div>
                  <div className="lp-desc">{cut(p.description, 110)}</div>
                </div>
              </div>
            </section>

            <section className="card lp-card" aria-label="X">
              <div className="lp-label">X (Twitter)</div>
              {p.twitterCard === "summary" ? (
                <div className="lp-x lp-x-small">
                  <Img src={p.image} className="lp-x-thumb" />
                  <div className="lp-body"><div className="lp-host">{p.host}</div><div className="lp-title">{cut(p.title, 70)}</div></div>
                </div>
              ) : (
                <div className="lp-x">
                  <Img src={p.image} className="lp-img" />
                  <div className="lp-x-cap">From {p.host}</div>
                </div>
              )}
              {!p.twitterCard && <p className="tiny muted">No twitter:card tag. X may show a small preview or none.</p>}
            </section>

            <section className="card lp-card" aria-label="WhatsApp and iMessage">
              <div className="lp-label">WhatsApp · iMessage</div>
              <div className="lp-chat">
                <div className="lp-bubble">
                  <Img src={p.image} className="lp-chat-img" />
                  <div className="lp-body">
                    <div className="lp-title">{cut(p.title || p.host, 70)}</div>
                    <div className="lp-desc">{cut(p.description, 80)}</div>
                    <div className="lp-host">{p.host}</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className="card tool-next">
            <h3>What to fix</h3>
            <CheckList checks={p.checks} />
            <p className="muted tiny">
              Previews are close approximations; each platform changes its layout from time to time and caches old previews. Images load straight from the site you check, so that site can see your IP address.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
