"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CopyBlock } from "@/components/ui";
import { buildSchema, SCHEMA_KINDS, schemaWarnings, toScriptTag, type Faq, type SchemaKind, type Values } from "@/lib/gen/schema";

export default function SchemaTool() {
  const [kind, setKind] = useState<SchemaKind>("Organization");
  const [values, setValues] = useState<Record<SchemaKind, Values>>({} as Record<SchemaKind, Values>);
  const [faqs, setFaqs] = useState<Faq[]>([{ q: "", a: "" }]);

  const spec = SCHEMA_KINDS.find((s) => s.kind === kind)!;
  const x = values[kind] ?? {};
  const set = (k: string, val: string) => setValues({ ...values, [kind]: { ...x, [k]: val } });
  const data = buildSchema(kind, x, faqs);
  const warnings = schemaWarnings(kind, x, faqs);
  const code = toScriptTag(data);

  return (
    <div className="tool tool-wide">
      <div className="schema-kinds" role="tablist" aria-label="Schema type">
        {SCHEMA_KINDS.map((s) => (
          <button key={s.kind} type="button" role="tab" aria-selected={kind === s.kind} className={kind === s.kind ? "on" : ""} onClick={() => setKind(s.kind)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="schema-layout">
        <div className="card schema-form">
          <h3>{spec.label}</h3>
          <p className="muted small">{spec.use}</p>
          {spec.fields.map((f) => {
            const id = `schema-${kind}-${f.key}`;
            return (
              <div key={f.key} className="schema-field">
                <label htmlFor={id}>{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>
                {f.kind === "select" ? (
                  <select id={id} className="field" value={x[f.key] ?? f.options![0]} onChange={(e) => set(f.key, e.target.value)}>
                    {f.options!.map((o) => <option key={o} value={o}>{o.replace(/([a-z])([A-Z])/g, "$1 $2")}</option>)}
                  </select>
                ) : f.kind === "textarea" || f.kind === "lines" ? (
                  <textarea id={id} className="field" rows={f.kind === "lines" ? 3 : 2} value={x[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input id={id} className="field" type={f.kind === "date" ? "date" : "text"} inputMode={f.kind === "url" ? "url" : undefined} value={x[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
                )}
                {f.hint && <p className="tiny muted">{f.hint}</p>}
              </div>
            );
          })}

          {kind === "FAQPage" && (
            <div className="schema-faqs">
              {faqs.map((f, i) => (
                <fieldset key={i} className="schema-faq">
                  <legend className="small">Question {i + 1}</legend>
                  <label htmlFor={`faq-q-${i}`} className="sr-only">Question {i + 1}</label>
                  <input id={`faq-q-${i}`} className="field" placeholder="How much does delivery cost?" value={f.q} onChange={(e) => setFaqs(faqs.map((g, j) => (j === i ? { ...g, q: e.target.value } : g)))} />
                  <label htmlFor={`faq-a-${i}`} className="sr-only">Answer {i + 1}</label>
                  <textarea id={`faq-a-${i}`} className="field" rows={2} placeholder="Delivery is free on orders over $40; otherwise it's $4.95." value={f.a} onChange={(e) => setFaqs(faqs.map((g, j) => (j === i ? { ...g, a: e.target.value } : g)))} />
                  {faqs.length > 1 && (
                    <button type="button" className="link small" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}><Trash2 size={14} /> Remove</button>
                  )}
                </fieldset>
              ))}
              <button type="button" onClick={() => setFaqs([...faqs, { q: "", a: "" }])}><Plus size={15} /> Add a question</button>
            </div>
          )}
        </div>

        <div className="schema-out">
          {warnings.length > 0 && (
            <ul className="schema-warn">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <CopyBlock content={code} filename="schema.html" />
          <p className="muted tiny">
            Paste it into the &lt;head&gt; of the page it describes (WordPress: your SEO plugin or a header-scripts plugin). Then test it in{" "}
            <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer">Google&apos;s Rich Results Test</a> or the{" "}
            <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer">Schema.org validator</a>. Only mark up what people can see on the page.
          </p>
        </div>
      </div>
    </div>
  );
}
