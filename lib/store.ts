import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Everything is saved in Supabase. JSON documents go in the `documents` table, and the
 * helpers below write to the dedicated tables. Server only: the secret key bypasses row
 * level security.
 */
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

let client: SupabaseClient | undefined;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("Supabase isn't configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  rejectPublicKey(key);
  return (client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next.js can cache fetch during rendering; these reads must always be fresh.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  }));
}

function failed(action: string, error: { message: string; code?: string }): never {
  // A missing table, column or function means supabase/schema.sql hasn't been run since the code changed.
  const stale = ["PGRST202", "PGRST205", "42703", "42P01"].includes(error.code ?? "") || /schema cache|does not exist/i.test(error.message);
  throw new Error(`Database ${action} failed: ${error.message}${stale ? ". Run the latest supabase/schema.sql in the Supabase SQL Editor" : ""}`);
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

/** Adds one or more rows to a dedicated table. */
export async function insertRow(table: string, row: Record<string, unknown> | Record<string, unknown>[]): Promise<void> {
  const { error } = await db().from(table).insert(jsonbSafe(row) as Record<string, unknown>[]);
  if (error) failed("write", error);
}

/** Every row of a dedicated table, newest first. */
export async function listRowsNewestFirst<T>(table: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db()
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

/** Deletes rows older than `days` from a dedicated table. */
export async function pruneRows(table: string, days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { error, count } = await db().from(table).delete({ count: "exact" }).lt("created_at", cutoff);
  if (error) failed("prune", error);
  return count ?? 0;
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
  const row = { collection, id: safeName(id), data: jsonbSafe(data), updated_at: new Date().toISOString() };
  const { error } = await db().from(TABLE).upsert(row);
  if (error) failed("write", error);
}

/** Returns null when the document doesn't exist. Throws if the database can't be reached. */
export async function readJson<T>(collection: string, id: string): Promise<T | null> {
  if (!validId(id)) return null;
  const { data, error } = await db().from(TABLE).select("data").eq("collection", collection).eq("id", id).maybeSingle();
  if (error) failed("read", error);
  return data ? (data.data as T) : null;
}

export async function listIds(collection: string): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db()
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

/** Documents in a collection whose JSON has `field` equal to `value`, for example every widget of one team. */
export async function listJsonWhere<T>(collection: string, field: string, value: string): Promise<T[]> {
  if (!/^[a-zA-Z]{1,40}$/.test(field)) throw new Error("Invalid field name.");
  const { data, error } = await db().from(TABLE).select("data").eq("collection", collection).eq(`data->>${field}`, value).limit(500);
  if (error) failed("list", error);
  return (data ?? []).map((row) => row.data as T);
}

export async function removeJson(collection: string, id: string): Promise<void> {
  const { error } = await db().from(TABLE).delete().eq("collection", collection).eq("id", safeName(id));
  if (error) failed("delete", error);
}

/** Delete documents older than `days` in a collection. */
export async function pruneOlderThan(collection: string, days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { error, count } = await db()
    .from(TABLE)
    .delete({ count: "exact" })
    .eq("collection", collection)
    .lt("updated_at", cutoff);
  if (error) failed("prune", error);
  return count ?? 0;
}
