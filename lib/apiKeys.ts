import crypto from "node:crypto";
import { listIds, readJson, removeJson, writeJson } from "./store";

/**
 * API keys for the public API (/api/v1/*). Issued by the admin until accounts exist.
 * Only a SHA-256 hash of each key is stored; the key itself is shown once when created.
 */
export interface ApiKey { id: string; name: string; prefix: string; perHour: number; createdAt: string; lastUsed?: string; uses: number }

const hash = (key: string) => crypto.createHash("sha256").update(key).digest("hex");
const idFor = (key: string) => hash(key).slice(0, 32);

export async function createApiKey(name: string, perHour = 100): Promise<{ key: string; record: ApiKey }> {
  const key = "fdb_" + crypto.randomBytes(24).toString("base64url");
  const record: ApiKey = { id: idFor(key), name: name.slice(0, 80), prefix: key.slice(0, 8), perHour, createdAt: new Date().toISOString(), uses: 0 };
  await writeJson("apikeys", record.id, record);
  return { key, record };
}

export async function verifyApiKey(key: string | null): Promise<ApiKey | null> {
  if (!key || !/^fdb_[\w-]{20,64}$/.test(key)) return null;
  const rec = await readJson<ApiKey>("apikeys", idFor(key));
  if (!rec) return null;
  rec.uses++;
  rec.lastUsed = new Date().toISOString();
  writeJson("apikeys", rec.id, rec).catch(() => {});
  return rec;
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const all = await Promise.all((await listIds("apikeys")).map((id) => readJson<ApiKey>("apikeys", id)));
  return all.filter((k): k is ApiKey => !!k).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const revokeApiKey = (id: string) => removeJson("apikeys", id);
