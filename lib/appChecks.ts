import { insertRow } from "./store";

/** Product statistics for app checks: which app, store and country, and the score. Nothing about the visitor. */
export function recordAppCheck(c: { store: string; appId: string; country: string; title: string; score: number; failed: string[] }): void {
  insertRow("app_checks", { store: c.store, app_id: c.appId, country: c.country, title: c.title.slice(0, 200), score: c.score, failed_checks: c.failed }).catch(
    (e) => console.error("Saving an app check failed:", e),
  );
}
