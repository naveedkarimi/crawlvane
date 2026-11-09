// Tests that forms still save to local files when Supabase isn't configured: `npm test`
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(os.tmpdir(), "crawlvane-tables-"));
process.env.DATA_DIR = dir;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.LEADS_NOTIFY_EMAIL;
const { saveLead, listLeads } = await import("../lib/leads");

try {
  await saveLead({ kind: "waitlist", email: "a@b.co" });
  assert.equal((await listLeads())[0].email, "a@b.co");
  console.log("✓ leads saved to files");

} finally {
  rmSync(dir, { recursive: true, force: true });
}
