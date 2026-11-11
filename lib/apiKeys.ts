import crypto from "node:crypto";
import { listIds, listJsonWhere, readJson, removeJson, writeJson } from "./store";

/**
 * API keys for the public API (/api/v1/*). Teams create their own in the dashboard; the admin
 * can still issue keys without a team. Only a SHA-256 hash of each key is stored, and the key
 * itself is shown once when created.
 */
export interface ApiKey { id: string; name: string; prefix: string; perHour: number; createdAt: string; lastUsed?: string; uses: number; orgId?: string }

/** New keys start with cv_. Keys issued before the rename start with fdb_ and still work. */
export const KEY_PREFIX = "cv_";
const KEY_SHAPE = /^(cv|fdb)_[\w-]{20,64}$/;

const hash = (key: string) => crypto.createHash("sha256").update(key).digest("hex");
const idFor = (key: string) => hash(key).slice(0, 32);

export async function createApiKey(name: string, perHour = 100, orgId?: string): Promise<{ key: string; record: ApiKey }> {
  const key = KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
  const record: ApiKey = { id: idFor(key), name: name.slice(0, 80), prefix: key.slice(0, 8), perHour, createdAt: new Date().toISOString(), uses: 0, ...(orgId ? { orgId } : {}) };
  await writeJson("apikeys", record.id, record);
  return { key, record };
}

export async function verifyApiKey(key: string | null): Promise<ApiKey | null> {
  if (!key || !KEY_SHAPE.test(key)) return null;
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

export async function listOrgApiKeys(orgId: string): Promise<ApiKey[]> {
  return (await listJsonWhere<ApiKey>("apikeys", "orgId", orgId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const revokeApiKey = (id: string) => removeJson("apikeys", id);

/** Revokes a key only if it belongs to this team. */
export async function revokeOrgApiKey(orgId: string, id: string): Promise<boolean> {
  const rec = await readJson<ApiKey>("apikeys", id);
  if (!rec || rec.orgId !== orgId) return false;
  await removeJson("apikeys", id);
  return true;
}
