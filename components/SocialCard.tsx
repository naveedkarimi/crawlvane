"use client";

import type { SocialPresence } from "@/lib/social";
import { useState } from "react";
import { Pill } from "./ui";

export default function SocialCard({ social }: { social: SocialPresence }) {
  const s = social.share;
  const [imgFailed, setImgFailed] = useState(false);
  let host = "";
  try {
    host = new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  return (
    <div className="card">
      <h3>Social & brand presence</h3>
      <div className="social-grid">
        <div>
          <ul className="plain">
            {social.checks.map((c) => (
              <li key={c.title} className={`check ${c.status}`}>
                <Pill status={c.status} />
                <div>
                  <div className="check-title">{c.title}</div>
                  <div className="check-detail">{c.detail}</div>
                  {c.status !== "pass" && c.fix && <div className="check-fix">→ {c.fix}</div>}
                </div>
              </li>
            ))}
          </ul>
          {social.profiles.length > 0 && (
            <div className="chips">
              {social.profiles.map((p) => (
                <a key={p.network} href={p.url} target="_blank" rel="noopener noreferrer nofollow" className={`chip ${p.inSchema ? "on" : ""}`} title={p.note ?? ""}>
                  {p.network} {p.inSchema ? "✓ schema" : ""}
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="muted small" style={{ marginBottom: 6 }}>How your link looks when shared</div>
          <div className="share-preview">
            {s.image && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image} alt="" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} />
            ) : s.image ? (
              <div className="share-noimg">og:image set but couldn&apos;t be loaded here — check the URL works publicly</div>
            ) : (
              <div className="share-noimg">No og:image — shares show no picture</div>
            )}
            <div className="share-body">
              <div className="share-host">{host}</div>
              <div className="share-title">{s.title || "(no title)"}</div>
              <div className="share-desc">{s.description || "(no description)"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
