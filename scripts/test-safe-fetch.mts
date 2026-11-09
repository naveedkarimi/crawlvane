// Tests for the connection-time private-network guard: `npm test`
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { guardedFetch, publicOnlyLookup, UnsafeUrlError, safeFetch } from "../lib/safeFetch";

type Addr = { address: string; family: number };
const run = (answers: Addr[], all: boolean) =>
  new Promise<{ err: Error | null; address?: unknown; family?: number }>((resolve) => {
    const fakeDns = ((_h: string, _o: unknown, cb: (e: Error | null, a: Addr[]) => void) => cb(null, answers)) as never;
    publicOnlyLookup(fakeDns)("rebind.test", { all }, (err, address, family) => resolve({ err, address, family }));
  });

// Public answers pass through in the shape net.connect asked for
const pub = [{ address: "93.184.216.34", family: 4 }];
assert.deepEqual(await run(pub, false), { err: null, address: "93.184.216.34", family: 4 });
assert.deepEqual((await run(pub, true)).address, pub);

// The rebinding case: this answer is only seen at connect time, and one bad address is enough
for (const address of ["127.0.0.1", "10.0.0.8", "169.254.169.254"]) {
  assert.ok((await run([{ address, family: 4 }], false)).err instanceof UnsafeUrlError, address);
}
assert.ok((await run([...pub, { address: "::1", family: 6 }], true)).err instanceof UnsafeUrlError, "mixed answers");
assert.ok((await run([], false)).err, "no addresses");
console.log("✓ connection-time lookup guard");

// Against a real socket: the guard has to be wired into the HTTP client, not just exist.
// "localhost" resolves to loopback, so nothing may reach this server.
let hits = 0;
const server = http.createServer((_q, s) => { hits++; s.end("secret"); });
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as AddressInfo).port;
try {
  const err = await guardedFetch(`http://localhost:${port}/`, {}).then(() => null, (e: Error) => e);
  assert.ok(err, "request should fail");
  assert.ok((err as Error & { cause?: unknown }).cause instanceof UnsafeUrlError, "failure should come from the guard");
  assert.equal(hits, 0, "no request may reach a private address");
  const viaSafe = await safeFetch(`http://localhost:${port}/`);
  assert.equal(viaSafe.status, 0);
  assert.equal(hits, 0);
} finally {
  server.close();
}
console.log("✓ guard wired into fetch");
