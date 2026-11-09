"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/** The rounded URL input used by every free tool. Calls onSubmit with a full https:// URL. */
export default function UrlForm({
  id,
  button,
  loading,
  onSubmit,
  placeholder = "yourbusiness.com",
}: {
  id: string;
  button: string;
  loading?: boolean;
  onSubmit: (url: string) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = input.trim();
        if (v) onSubmit(v.includes("://") ? v : `https://${v}`);
      }}
    >
      <label htmlFor={id} className="sr-only">Website URL</label>
      <input id={id} type="text" inputMode="url" autoComplete="url" placeholder={placeholder} value={input} onChange={(e) => setInput(e.target.value)} />
      <button type="submit" disabled={!input.trim() || loading}>
        {loading ? <><Loader2 size={16} className="spin" /> Checking</> : button}
      </button>
    </form>
  );
}
