// Tests when monitoring sends alerts: `npm test`
import assert from "node:assert/strict";

const { siteAlertReason, appAlertLines } = await import("../lib/orgMonitoring");

assert.equal(siteAlertReason(null, { overall: 50, fails: 3 }), null);
assert.match(siteAlertReason({ overall: 80, fails: 2 }, { overall: 74, fails: 2 }) ?? "", /dropped from 80 to 74/);
assert.equal(siteAlertReason({ overall: 80, fails: 2 }, { overall: 77, fails: 2 }), null);
assert.match(siteAlertReason({ overall: 80, fails: 2 }, { overall: 80, fails: 4 }) ?? "", /2 new failing checks/);
console.log("✓ site alerts on a 5-point drop or new failing checks");

const snap = (rating: number, rivalUpdated: string) => ({ at: "", rating, ratingCount: 100, score: 80, lastUpdated: null, competitors: [{ id: "r1", title: "Rival", rating: 4.5, ratingCount: 10, lastUpdated: rivalUpdated }] });
assert.deepEqual(appAlertLines(null, snap(4.5, "2026-01-01")), []);
assert.deepEqual(appAlertLines(snap(4.5, "2026-01-01"), snap(4.45, "2026-01-01")), []);
const lines = appAlertLines(snap(4.5, "2026-01-01"), snap(4.3, "2026-02-01"));
assert.equal(lines.length, 2);
assert.match(lines[0], /dropped from 4\.50 to 4\.30/);
assert.match(lines[1], /Rival shipped an update/);
console.log("✓ app alerts on a rating drop and competitor updates");
