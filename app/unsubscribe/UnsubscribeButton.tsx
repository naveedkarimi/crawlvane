"use client";

import { useState } from "react";
import { unsubscribeNewsletter } from "@/lib/supabasePublic";

/** A button rather than automatic, so email scanners opening the link can't unsubscribe anyone. */
export default function UnsubscribeButton() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "gone">("idle");
  const [err, setErr] = useState("");

  if (state === "done") return <p className="lead" role="status">You&apos;re unsubscribed. You won&apos;t get any more newsletter emails.</p>;
  if (state === "gone") return <p className="lead" role="status">This email isn&apos;t on the list any more.</p>;
  return (
    <>
      <p className="lead">Click below and we&apos;ll remove your email from the list.</p>
      <button
        className="btn btn-primary"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          setErr("");
          try {
            const token = new URLSearchParams(window.location.search).get("token") ?? "";
            setState((await unsubscribeNewsletter(token)) ? "done" : "gone");
          } catch (e) {
            setState("idle");
            setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
          }
        }}
      >
        {state === "busy" ? "Removing…" : "Unsubscribe"}
      </button>
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </>
  );
}
