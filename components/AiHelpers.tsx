"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, CircleHelp, ListChecks, MessageSquareQuote, Sparkles, Type } from "lucide-react";
import { api } from "@/lib/client";
import { CopyBlock } from "./ui";
import type { AnswerRewrite, FaqResult, HelperKind, MetaIdeas, TopicCoverage } from "@/lib/ai/helpers";
import type { AuditFacts } from "@/lib/types";

type Results = { topics?: TopicCoverage; answers?: AnswerRewrite[]; faq?: FaqResult; meta?: MetaIdeas };

const HELPERS: { kind: HelperKind; label: string; text: string; icon: typeof Sparkles }[] = [
  { kind: "topics", label: "Topic coverage", text: "The questions a complete page on this topic answers, and which ones yours misses.", icon: ListChecks },
  { kind: "answers", label: "Answer rewrites", text: "A 40 to 60 word answer to open each key section, the length AI Overviews quote.", icon: MessageSquareQuote },
  { kind: "faq", label: "FAQ builder", text: "Questions customers ask, answered from your page, with the HTML and schema to paste.", icon: CircleHelp },
  { kind: "meta", label: "Title and description", text: "Title tags and meta descriptions that fit in search results.", icon: Type },
];

const COVER = {
  yes: { label: "Covered", cls: "ok", Icon: CheckCircle2 },
  partly: { label: "Partly", cls: "different", Icon: CircleDashed },
  no: { label: "Missing", cls: "blocked", Icon: CircleDashed },
} as const;

/** AI helpers for the page just checked. Each button is one AI call (one or two credits on paid plans). */
export default function AiHelpers({ facts, url }: { facts: AuditFacts; url: string }) {
  const [busy, setBusy] = useState<HelperKind | null>(null);
  const [res, setRes] = useState<Results>({});
  const [err, setErr] = useState("");
  const run = async (kind: HelperKind) => {
    setBusy(kind);
    setErr("");
    try {
      const r = await api<{ kind: HelperKind; result: unknown }>("/api/ai-helpers", { method: "POST", body: JSON.stringify({ kind, facts: { ...facts, url } }) });
      setRes((x) => ({ ...x, [kind]: r.result }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="card ai-helpers no-print" aria-labelledby="ai-helpers-title">
      <div className="ai-helpers-head">
        <span className="ai-helpers-icon" aria-hidden="true"><Sparkles size={18} /></span>
        <div>
          <h3 id="ai-helpers-title">AI helpers for this page</h3>
          <p className="muted small">Written from your page&apos;s own text. Anything the page doesn&apos;t say is left as a [placeholder] for you to fill in.</p>
        </div>
      </div>
      <div className="ai-helper-buttons">
        {HELPERS.map(({ kind, label, text, icon: Icon }) => (
          <button key={kind} type="button" className={`ai-helper ${res[kind] ? "done" : ""}`} disabled={busy !== null} onClick={() => run(kind)} aria-busy={busy === kind}>
            <Icon size={18} aria-hidden="true" />
            <span><strong>{busy === kind ? "Working…" : label}</strong><small>{text}</small></span>
          </button>
        ))}
      </div>
      {err && <p className="c-fail small" role="alert">{err}</p>}

      {res.topics && (
        <div className="ai-out">
          <h4>Topic coverage: {res.topics.topic}</h4>
          {res.topics.summary && <p className="muted small">{res.topics.summary}</p>}
          <ul className="ai-topics">
            {res.topics.questions.map((q) => {
              const c = COVER[q.covered];
              return (
                <li key={q.question}>
                  <span className={`livestat livestat-${c.cls}`}><c.Icon size={13} aria-hidden="true" /> {c.label}</span>
                  <span>{q.question}{q.where && <small className="muted"> · under &ldquo;{q.where}&rdquo;</small>}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {res.answers && (
        <div className="ai-out">
          <h4>Answers to open each section</h4>
          {res.answers.length ? res.answers.map((a) => (
            <div key={a.heading} className="ai-answer">
              <strong>{a.heading}</strong> <span className="muted tiny">{a.words} words</span>
              <CopyBlock content={a.answer} filename={undefined} />
            </div>
          )) : <p className="muted small">No headings here suit a direct answer.</p>}
        </div>
      )}

      {res.faq && (
        <div className="ai-out">
          <h4>FAQ section</h4>
          <dl className="ai-faq">{res.faq.items.map((i) => <div key={i.question}><dt>{i.question}</dt><dd>{i.answer}</dd></div>)}</dl>
          <p className="muted tiny">Paste the HTML where the FAQ should appear, and the schema in the page&apos;s head. Search engines no longer show FAQ rich results, but the questions still help answer engines.</p>
          <CopyBlock content={res.faq.html} filename="faq.html" />
          <CopyBlock content={res.faq.jsonLd} filename="faq-schema.html" />
        </div>
      )}

      {res.meta && (
        <div className="ai-out">
          <h4>Title and description ideas</h4>
          <p className="muted small">Now: &ldquo;{facts.title || "no title"}&rdquo; ({facts.title.length} characters)</p>
          <ul className="ai-meta">{res.meta.titles.map((t) => <li key={t}><span>{t}</span><small className="muted">{t.length}/60</small></li>)}</ul>
          <ul className="ai-meta">{res.meta.descriptions.map((t) => <li key={t}><span>{t}</span><small className="muted">{t.length}/160</small></li>)}</ul>
        </div>
      )}
    </section>
  );
}
