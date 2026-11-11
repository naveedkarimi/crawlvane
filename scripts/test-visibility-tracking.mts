// Tests AI visibility trend maths: `npm test`
import assert from "node:assert/strict";

const { averageMention, visibilityAlert } = await import("../lib/visibilityTracking");
const run = (rates: [string, number, number][]) => ({ at: "", shareOfVoice: [], summary: rates.map(([engine, mentionRate, answered]) => ({ engine, mentionRate, citationRate: 0, answered })) });

assert.equal(averageMention([]), null);
assert.equal(averageMention(run([["Claude", 50, 8], ["ChatGPT", 30, 8]]).summary), 40);
assert.equal(averageMention(run([["Claude", 50, 8], ["Gemini", 0, 0]]).summary), 50);
console.log("✓ average mention rate ignores engines that didn't answer");

assert.equal(visibilityAlert(null, run([["Claude", 10, 8]])), null);
assert.equal(visibilityAlert(run([["Claude", 60, 8]]), run([["Claude", 45, 8]])), null);
assert.match(visibilityAlert(run([["Claude", 60, 8]]), run([["Claude", 30, 8]])) ?? "", /60% of answers last time, 30% now/);
console.log("✓ alerts when AI mentions fall by 20 points");
