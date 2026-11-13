"use client";

import { useEffect, useState } from "react";

/** The address that wasn't found, shown as a crawler log line. Read in the browser, so the page stays static. */
export default function NotFoundPath() {
  const [path, setPath] = useState("/…");
  useEffect(() => setPath(decodeURI(window.location.pathname + window.location.search).slice(0, 120)), []);
  return (
    <div className="nf-log" aria-label={`Request for ${path} returned 404 Not Found`}>
      <span className="nf-log-method">GET</span>
      <span className="nf-log-path">{path}</span>
      <span className="nf-log-status">404 Not Found</span>
    </div>
  );
}
