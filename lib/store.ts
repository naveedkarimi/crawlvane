import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * JSON document store. Saves to the Supabase `documents` table when SUPABASE_URL and
 * SUPABASE_SECRET_KEY are set, and to files in DATA_DIR when neither is (tests, local work).
 * Server only: the secret key bypasses row level security.
 */
export const DATA_DIR = process.env.DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data");

const TABLE = "documents";
/** Supabase returns at most this many rows per request by default. */
const PAGE_SIZE = 1000;

/** A public key can't read or write the table, so reads would just look empty. Stop early instead. */
function rejectPublicKey(key: string) {
  let isPublic = key.startsWith("sb_publishable_");
  try {
    isPublic ||= JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon";
  } catch {
    /* not a JWT: the new sb_secret_ format */
  }
  if (isPublic) throw new Error("SUPABASE_SECRET_KEY is the public (anon) key. Use the secret (service_role) key.");
}

let client: SupabaseClient | null | undefined;

export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url && !key) {
    if (process.env.NODE_ENV === "production") console.warn("Supabase is not configured: saving to local files.");
    return (client = null);
  }
  if (!url || !key) throw new Error("Set both SUPABASE_URL and SUPABASE_SECRET_KEY, or neither.");
  rejectPublicKey(key);
  return (client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next.js can cache fetch during rendering; these reads must always be fresh.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  }));
}

function failed(action: string, error: { message: string }): never {
  throw new Error(`Database ${action} failed: ${error.message}`);
}

/** jsonb rejects NUL characters and half an emoji, and both can come from crawled or cut-off text. */
function jsonbSafe(data: unknown): unknown {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "string"
        ? value.replace(/\0/g, "").replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�")
        : value,
    ),
  );
}

/** Makes a row safe to send: Postgres text refuses the same characters jsonb does. */
export const insertSafe = (row: Record<string, unknown>) => jsonbSafe(row) as Record<string, unknown>;

/** Adds a row to one of the dedicated tables. Only call when db() is set. */
export async function insertRow(table: string, row: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const { error } = await db()!.from(table).insert(jsonbSafe(row) as Record<string, unknown>[]);
  if (error) failed("write", error);
}

/** Every row of a dedicated table, newest first. Only call when db() is set. */
export async function listRowsNewestFirst<T>(table: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db()!
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) failed("list", error);
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

/** Deletes rows older than `days` from a dedicated table. Does nothing without Supabase. */
export async function pruneRows(table: string, days: number): Promise<number> {
  const supabase = db();
  if (!supabase) return 0;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { error, count } = await supabase.from(table).delete({ count: "exact" }).lt("created_at", cutoff);
  if (error) failed("prune", error);
  return count ?? 0;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

const validId = (id: string) => /^[a-zA-Z0-9_-]{6,64}$/.test(id);

function safeName(id: string) {
  if (!validId(id)) throw new Error("Invalid id");
  return id;
}

export function newId(len = 12): string {
  return crypto.randomBytes(16).toString("base64url").slice(0, len);
}

export async function writeJson(collection: string, id: string, data: unknown): Promise<void> {
  const supabase = db();
  if (supabase) {
    const row = { collection, id: safeName(id), data: jsonbSafe(data), updated_at: new Date().toISOString() };
    const { error } = await supabase.from(TABLE).upsert(row);
    if (error) failed("write", error);
    return;
  }
  const dir = path.join(DATA_DIR, collection);
  await ensureDir(dir);
  const file = path.join(dir, safeName(id) + ".json");
  const tmp = file + "." + process.pid + "." + Date.now() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, file); // atomic replace
}

/** Returns null when the document doesn't exist. Throws if the database can't be reached. */
export async function readJson<T>(collection: string, id: string): Promise<T | null> {
  const supabase = db();
  if (supabase) {
    if (!validId(id)) return null;
    const { data, error } = await supabase.from(TABLE).select("data").eq("collection", collection).eq("id", id).maybeSingle();
    if (error) failed("read", error);
    return data ? (data.data as T) : null;
  }
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, collection, safeName(id) + ".json"), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function listIds(collection: string): Promise<string[]> {
  const supabase = db();
  if (supabase) {
    const ids: string[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("id")
        .eq("collection", collection)
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) failed("list", error);
      ids.push(...data.map((row) => row.id as string));
      if (data.length < PAGE_SIZE) return ids;
    }
  }
  try {
    const files = await fs.readdir(path.join(DATA_DIR, collection));
    return files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
}

export async function removeJson(collection: string, id: string): Promise<void> {
  const supabase = db();
  if (supabase) {
    const { error } = await supabase.from(TABLE).delete().eq("collection", collection).eq("id", safeName(id));
    if (error) failed("delete", error);
    return;
  }
  await fs.rm(path.join(DATA_DIR, collection, safeName(id) + ".json"), { force: true });
}

/** Delete documents older than `days` in a collection. */
export async function pruneOlderThan(collection: string, days: number): Promise<number> {
  const supabase = db();
  if (supabase) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const { error, count } = await supabase
      .from(TABLE)
      .delete({ count: "exact" })
      .eq("collection", collection)
      .lt("updated_at", cutoff);
    if (error) failed("prune", error);
    return count ?? 0;
  }
  const dir = path.join(DATA_DIR, collection);
  let n = 0;
  try {
    for (const f of await fs.readdir(dir)) {
      const p = path.join(dir, f);
      const st = await fs.stat(p);
      if (Date.now() - st.mtimeMs > days * 86400000) {
        await fs.rm(p, { force: true });
        n++;
      }
    }
  } catch {
    /* dir missing */
  }
  return n;
}
