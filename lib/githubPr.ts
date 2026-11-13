import { BRAND } from "./brand";

/**
 * Opens a pull request with a report's generated fixes, using a GitHub token the user pastes for
 * this one request (never stored). Only talks to api.github.com.
 */
export class GithubError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const isRepo = (r: unknown): r is string => typeof r === "string" && /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(r) && !r.split("/").some((p) => /^\.+$/.test(p));
export const isGithubToken = (t: unknown): t is string => typeof t === "string" && /^(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})$/.test(t.trim());
/** "public/" or "" → a safe folder prefix with a trailing slash, no "..". */
export function cleanDir(dir: unknown): string {
  const d = String(dir ?? "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!d) return "";
  if (d.split("/").some((p) => !p || p === "." || p === ".." || !/^[A-Za-z0-9_.-]+$/.test(p))) throw new GithubError("Use a simple folder name, like public.");
  return d + "/";
}

export interface PrFile { path: string; content: string }

async function gh<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json", "user-agent": `${BRAND.name.replace(/[^A-Za-z0-9]/g, "")}-fixes` },
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
  if (res.status === 404 && init.method === undefined) throw new GithubError("not-found", 404);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) throw new GithubError("GitHub didn't accept that token.", 401);
    if (res.status === 403) throw new GithubError("That token can't write to this repository. It needs Contents and Pull requests write access.", 403);
    if (res.status === 404) throw new GithubError("Repository or branch not found, or the token can't see it.", 404);
    throw new GithubError(`GitHub said: ${body.message ?? res.status}`, 502);
  }
  return (await res.json()) as T;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

export async function openFixPr(opts: { token: string; repo: string; base?: string; files: PrFile[]; title: string; body: string }): Promise<{ url: string; number: number }> {
  const { token, repo } = opts;
  if (!isRepo(repo)) throw new GithubError("Enter the repository as owner/name.");
  if (!isGithubToken(token)) throw new GithubError("Paste a GitHub token (it starts with github_pat_ or ghp_).");
  if (!opts.files.length) throw new GithubError("There are no fixes to add.");
  const r = await gh<{ default_branch: string }>(token, `/repos/${repo}`).catch((e) => { throw e instanceof GithubError && e.message === "not-found" ? new GithubError("Repository not found, or the token can't see it.", 404) : e; });
  const base = (opts.base || r.default_branch).trim();
  if (!/^[A-Za-z0-9._/-]{1,200}$/.test(base)) throw new GithubError("That branch name isn't valid.");
  const ref = await gh<{ object: { sha: string } }>(token, `/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`).catch((e) => { throw e instanceof GithubError && e.message === "not-found" ? new GithubError(`Branch ${base} not found.`, 404) : e; });
  const branch = `${BRAND.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-fixes-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 7)}`;
  await gh(token, `/repos/${repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }) });
  for (const f of opts.files) {
    const path = f.path.split("/").map(encodeURIComponent).join("/");
    const existing = await gh<{ sha: string }>(token, `/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`).catch(() => null);
    await gh(token, `/repos/${repo}/contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `Add ${f.path} from ${BRAND.name}`, content: b64(f.content), branch, ...(existing?.sha ? { sha: existing.sha } : {}) }) });
  }
  const pr = await gh<{ html_url: string; number: number }>(token, `/repos/${repo}/pulls`, { method: "POST", body: JSON.stringify({ title: opts.title, head: branch, base, body: opts.body }) });
  return { url: pr.html_url, number: pr.number };
}
