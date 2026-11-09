// Tests for the Supabase side of the document store, against a fake API: `npm test`
import assert from "node:assert/strict";

type Row = { collection: string; id: string; data: unknown; updated_at: string };
let rows: Row[] = [];
let requests: { method: string; url: URL; body: string }[] = [];
let failNext = false;

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

/** The few PostgREST behaviours the store relies on. */
globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  const method = init.method ?? "GET";
  const body = typeof init.body === "string" ? init.body : "";
  requests.push({ method, url, body });
  if (failNext) {
    failNext = false;
    return json({ message: "boom" }, { status: 500 });
  }
  const eq = (name: string) => url.searchParams.get(name)?.replace(/^eq\./, "");
  const matches = rows.filter((r) => (!eq("collection") || r.collection === eq("collection")) && (!eq("id") || r.id === eq("id")));
  if (method === "POST") {
    const row = JSON.parse(body) as Row;
    rows = rows.filter((r) => !(r.collection === row.collection && r.id === row.id)).concat(row);
    return new Response(null, { status: 201 });
  }
  if (method === "DELETE") {
    const before = url.searchParams.get("updated_at")?.replace(/^lt\./, "");
    const gone = matches.filter((r) => !before || r.updated_at < before);
    rows = rows.filter((r) => !gone.includes(r));
    return new Response(null, { status: 204, headers: { "content-range": `*/${gone.length}` } });
  }
  const sorted = [...matches].sort((a, b) => a.id.localeCompare(b.id));
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 1000);
  return json(sorted.slice(offset, offset + limit));
}) as typeof fetch;

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
const { writeJson, readJson, listIds, removeJson, pruneOlderThan } = await import("../lib/store");

// Write, overwrite, read
await writeJson("reports", "report01", { score: 1 });
await writeJson("reports", "report01", { score: 2 });
assert.equal(rows.length, 1);
assert.deepEqual(await readJson("reports", "report01"), { score: 2 });
console.log("✓ store write and read");

// Missing and malformed ids are "not found", and a malformed id never reaches the database
assert.equal(await readJson("reports", "missing1"), null);
const sent = requests.length;
assert.equal(await readJson("reports", "../../etc/passwd"), null);
assert.equal(requests.length, sent);
await assert.rejects(writeJson("reports", "../bad", {}), /Invalid id/);
console.log("✓ store missing and invalid ids");

// Text Postgres would refuse is cleaned, and normal emoji survive
await writeJson("reports", "unicode1", { text: "a\0b \uD83D", ok: "😀", list: ["\uDE00x"] });
assert.deepEqual(await readJson("reports", "unicode1"), { text: "ab �", ok: "😀", list: ["�x"] });
console.log("✓ store cleans text jsonb rejects");

// A database failure is an error, not a missing document
failNext = true;
await assert.rejects(readJson("reports", "report01"), /Database read failed: boom/);
failNext = true;
await assert.rejects(writeJson("reports", "report01", {}), /Database write failed: boom/);
failNext = true;
await assert.rejects(listIds("reports"), /Database list failed: boom/);
console.log("✓ store surfaces database errors");

// Lists go past the 1,000 rows Supabase returns per request, and stay within the collection
rows = Array.from({ length: 2500 }, (_, i) => ({ collection: "leads", id: `lead${String(i).padStart(5, "0")}`, data: {}, updated_at: "2026-01-01T00:00:00.000Z" }));
rows.push({ collection: "other", id: "other001", data: {}, updated_at: "2026-01-01T00:00:00.000Z" });
const ids = await listIds("leads");
assert.equal(ids.length, 2500);
assert.equal(new Set(ids).size, 2500);
console.log("✓ store lists every page");

// Prune only touches old documents in the named collection
const old = new Date(Date.now() - 40 * 86400000).toISOString();
const fresh = new Date().toISOString();
rows = [
  { collection: "reports", id: "oldone01", data: {}, updated_at: old },
  { collection: "reports", id: "newone01", data: {}, updated_at: fresh },
  { collection: "leads", id: "oldlead1", data: {}, updated_at: old },
];
assert.equal(await pruneOlderThan("reports", 30), 1);
assert.deepEqual(rows.map((r) => r.id).sort(), ["newone01", "oldlead1"]);
console.log("✓ store prunes old documents");

// Remove deletes one document only
await removeJson("reports", "newone01");
assert.deepEqual(rows.map((r) => r.id), ["oldlead1"]);
console.log("✓ store removes one document");
