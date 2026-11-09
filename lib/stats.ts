import { readJson, writeJson } from "./store";

/** Running count of finished audits, for social proof on the home page. Approximate across processes. */
interface Stats { audits: number; since: string }
const ID = "global";

export async function countAudit(): Promise<void> {
  const s = (await readJson<Stats>("stats", ID)) ?? { audits: 0, since: new Date().toISOString() };
  s.audits++;
  await writeJson("stats", ID, s);
}

export async function getStats(): Promise<Stats> {
  return (await readJson<Stats>("stats", ID)) ?? { audits: 0, since: new Date().toISOString() };
}
