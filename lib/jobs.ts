import { randomBytes } from "node:crypto";
import { db } from "./store";
import { LIMITS } from "./config";

/**
 * A job queue in Supabase, so full reports survive a restart and any server process can run them.
 * Off unless JOB_QUEUE=1; without it, reports run in the process that started them, as before.
 *
 *  - createReport adds a row; a worker in this process claims it with claim_job (FOR UPDATE SKIP
 *    LOCKED, so two processes never take the same job) and keeps extending its lock while it works.
 *  - If a process dies, the lock runs out and the next worker (woken by /api/cron or a new report)
 *    takes the job again. After MAX_ATTEMPTS tries it's marked failed and the report shows an error.
 */
export const MAX_ATTEMPTS = 2;
export const LOCK_SECONDS = 12 * 60;
export const queueEnabled = () => process.env.JOB_QUEUE === "1" && !!process.env.SUPABASE_URL?.trim();

export interface Job { id: string; kind: string; ref_id: string; attempts: number }

/** Too many tries: stop retrying and report the failure instead. */
export const shouldGiveUp = (job: Pick<Job, "attempts">) => job.attempts > MAX_ATTEMPTS;

// ---------- Database ----------
const workerId = `w-${process.pid}-${randomBytes(4).toString("hex")}`;

export async function enqueue(kind: string, refId: string): Promise<void> {
  const { error } = await db().from("jobs").insert({ kind, ref_id: refId });
  if (error) throw new Error(`Database write failed: ${error.message}`);
}

async function claim(): Promise<Job | null> {
  const { data, error } = await db().rpc("claim_job", { p_worker: workerId, p_lock_seconds: LOCK_SECONDS });
  if (error) throw new Error(`Claiming a job failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? (row as Job) : null;
}

async function extend(id: string): Promise<void> {
  await db().from("jobs").update({ locked_until: new Date(Date.now() + LOCK_SECONDS * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("worker", workerId);
}

async function finish(id: string, ok: boolean, error?: string): Promise<void> {
  await db().from("jobs").update({ status: ok ? "done" : "failed", error: error?.slice(0, 500) ?? null, locked_until: null, updated_at: new Date().toISOString() }).eq("id", id);
}

// ---------- Running ----------
export type Runner = (job: Job, keepAlive: () => Promise<void>) => Promise<void>;
export type GiveUp = (job: Job) => Promise<void>;

/**
 * Claims and runs jobs until none are left, with up to `concurrency` at once. Database calls are
 * passed in, so the loop is tested without a database.
 */
export async function drainWith(
  deps: { claim: () => Promise<Job | null>; extend: (id: string) => Promise<void>; finish: (id: string, ok: boolean, error?: string) => Promise<void> },
  run: Runner,
  giveUp: GiveUp,
  concurrency: number,
): Promise<number> {
  let ran = 0;
  const lane = async () => {
    for (;;) {
      const job = await deps.claim();
      if (!job) return;
      if (shouldGiveUp(job)) {
        await giveUp(job).catch(() => {});
        await deps.finish(job.id, false, "Stopped after too many attempts");
        continue;
      }
      let last = 0;
      const keepAlive = async () => {
        if (Date.now() - last < 60_000) return;
        last = Date.now();
        await deps.extend(job.id).catch(() => {});
      };
      try {
        await run(job, keepAlive);
        await deps.finish(job.id, true);
      } catch (e) {
        await deps.finish(job.id, false, e instanceof Error ? e.message : String(e));
      }
      ran++;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, lane));
  return ran;
}

/** The job kinds this app knows how to run. */
const RUNNERS: Record<string, { run: Runner; giveUp: GiveUp }> = {
  report: {
    run: async (job, keepAlive) => {
      const { getReport, runReport } = await import("./report");
      const report = await getReport(job.ref_id);
      if (!report || report.status === "done") return;
      await runReport(report, { onSave: keepAlive });
    },
    giveUp: async (job) => {
      const { getReport } = await import("./report");
      const { writeJson } = await import("./store");
      const report = await getReport(job.ref_id);
      if (!report || report.status === "done") return;
      report.status = "error";
      report.error = "The report stopped unexpectedly twice (the server may have restarted). Please run it again.";
      report.updatedAt = new Date().toISOString();
      await writeJson("reports", report.id, report);
    },
  },
};

let draining: Promise<number> | null = null;

/** Starts this process's worker if it isn't running. Safe to call often (after enqueue and from cron). */
export function kickWorker(): Promise<number> {
  if (!queueEnabled()) return Promise.resolve(0);
  draining ??= drainWith(
    { claim, extend, finish },
    (job, keepAlive) => {
      const r = RUNNERS[job.kind];
      if (!r) throw new Error(`Unknown job kind: ${job.kind}`);
      return r.run(job, keepAlive);
    },
    async (job) => RUNNERS[job.kind]?.giveUp(job),
    LIMITS.maxConcurrentJobs,
  )
    .catch((e) => {
      console.error("Job worker stopped:", e instanceof Error ? e.message : e);
      return 0;
    })
    .finally(() => { draining = null; });
  return draining;
}
