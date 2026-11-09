"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type AppConfig } from "@/lib/client";
import { SoonBadge } from "./ui";

export default function ReportForm({ initialUrl, cfg, on }: { initialUrl: string; cfg: AppConfig | null; on: (k: string) => boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [maxPages, setMaxPages] = useState(cfg?.limits.maxPagesDefault ?? 50);
  const [competitors, setCompetitors] = useState(["", "", ""]);
  const [aiPlan, setAiPlan] = useState(true);
  const [aiVisibility, setAiVisibility] = useState(false);
  const [prompts, setPrompts] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
  const [render, setRender] = useState(false);
  const [socialPosts, setSocialPosts] = useState(false);
  const [wlName, setWlName] = useState("");
  const [wlLogo, setWlLogo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plan = (k: string) => cfg?.features.find((f) => f.key === k)?.plan;

  const Option = ({ k, label, hint, checked, set }: { k: string; label: string; hint: string; checked: boolean; set: (v: boolean) => void }) => {
    const enabled = on(k);
    return (
      <label className={`option ${enabled ? "" : "disabled"}`}>
        <input type="checkbox" disabled={!enabled} checked={enabled && checked} onChange={(e) => set(e.target.checked)} />
        <span>
          <strong>{label}</strong> {!enabled && <SoonBadge plan={plan(k)} />}
          <span className="muted small block">{hint}</span>
        </span>
      </label>
    );
  };

  return (
    <form
      className="report-form card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await api<{ id: string }>("/api/reports", {
            method: "POST",
            body: JSON.stringify({
              url,
              maxPages,
              competitors: competitors.filter((c) => c.trim()),
              aiPlan,
              aiVisibility,
              visibilityPrompts: prompts.split("\n").map((p) => p.trim()).filter(Boolean),
              deepResearch,
              render,
              socialPosts,
              whiteLabel: wlName ? { name: wlName, logoUrl: wlLogo } : undefined,
            }),
          });
          router.push(`/report/${r.id}`);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to start report");
          setBusy(false);
        }
      }}
    >
      <label className="lbl" htmlFor="full-url">Your website</label>
      <input id="full-url" className="field big" required placeholder="yourbusiness.com" value={url} onChange={(e) => setUrl(e.target.value)} />

      <label className="lbl">Pages to crawl: <strong>{maxPages}</strong></label>
      <input type="range" min={5} max={cfg?.limits.maxPagesHard ?? 300} step={5} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} />

      {on("competitors") && (
        <>
          <label className="lbl">Competitors (optional, up to 3)</label>
          <div className="comp-inputs">
            {competitors.map((c, i) => (
              <input
                key={i}
                className="field"
                placeholder={`competitor${i + 1}.com`}
                value={c}
                onChange={(e) => setCompetitors(competitors.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
          </div>
        </>
      )}

      <div className="options">
        <Option k="aiPlan" label="AI fix plan" hint="Claude writes a prioritised, step-by-step plan from the findings." checked={aiPlan} set={setAiPlan} />
        <Option k="aiVisibility" label="AI visibility test" hint="Ask ChatGPT, Claude, Perplexity & Gemini real buyer questions — are you mentioned or cited?" checked={aiVisibility} set={setAiVisibility} />
        {on("aiVisibility") && aiVisibility && (
          <textarea
            className="field"
            rows={3}
            placeholder={"Optional: one question per line (leave empty to auto-generate)\ne.g. best dentist in Toronto for kids"}
            value={prompts}
            onChange={(e) => setPrompts(e.target.value)}
          />
        )}
        <Option k="deepResearch" label="Deep niche research" hint="Questions your audience asks, sources AI trusts, content gaps and a content plan." checked={deepResearch} set={setDeepResearch} />
        <Option k="socialPosts" label="AI social media posts" hint="Ready-to-post LinkedIn, X, Facebook, Instagram and Reddit posts." checked={socialPosts} set={setSocialPosts} />
        <Option k="jsRender" label="Render JavaScript" hint="For React/Vue/SPA sites whose content loads with JavaScript." checked={render} set={setRender} />
        <Option k="whiteLabel" label="White-label report" hint="Your agency name and logo on the report." checked={!!wlName} set={(v) => !v && setWlName("")} />
        {on("whiteLabel") && (
          <div className="comp-inputs">
            <input className="field" placeholder="Agency name" value={wlName} onChange={(e) => setWlName(e.target.value)} />
            <input className="field" placeholder="https://… logo URL (optional)" value={wlLogo} onChange={(e) => setWlLogo(e.target.value)} />
          </div>
        )}
      </div>

      <button className="primary big" disabled={busy || !url.trim()}>
        {busy ? "Starting…" : "Generate full report"}
      </button>
      <p className="muted small center">Free during launch. Takes 1–5 minutes depending on pages and options.</p>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
