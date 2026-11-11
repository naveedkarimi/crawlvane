"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import OpeningSpinner from "./OpeningSpinner";

export default function AcceptInvite({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "opening" | "signin" | "error">("idle");
  const [err, setErr] = useState("");
  const accept = async () => {
    setState("busy");
    try {
      await api("/api/me/invites/accept", { method: "POST", body: JSON.stringify({ token }) });
      setState("opening");
      window.location.href = "/dashboard"; // Invites open on the app address, so this stays there.
    } catch (e) {
      const m = e instanceof Error ? e.message : "That didn't work.";
      if (/sign in/i.test(m)) setState("signin");
      else { setErr(m); setState("error"); }
    }
  };
  if (state === "opening") return <OpeningSpinner label="Opening your team's dashboard…" />;
  if (state === "signin")
    return <a className="btn btn-primary btn-lg" href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>Sign in to accept <ArrowRight size={16} aria-hidden="true" /></a>;
  return (
    <div className="center-actions">
      <button className="btn btn-primary btn-lg" disabled={state === "busy"} onClick={accept}>{state === "busy" ? "Joining…" : "Accept the invite"} <ArrowRight size={16} aria-hidden="true" /></button>
      {err && <p className="c-fail small" role="alert">{err}</p>}
    </div>
  );
}
