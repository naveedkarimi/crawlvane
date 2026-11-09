"use client";

import { useState } from "react";
import BotTest from "@/components/BotTest";

export default function BotChecker() {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div className="tool">
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          const v = input.trim();
          if (v) setUrl(v.includes("://") ? v : `https://${v}`);
        }}
      >
        <label htmlFor="bot-url" className="sr-only">Website URL</label>
        <input id="bot-url" type="text" inputMode="url" placeholder="yourbusiness.com" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={!input.trim()}>Check bots</button>
      </form>
      {url && <div className="tool-result"><BotTest url={url} autoRun /></div>}
    </div>
  );
}
