import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension.
import { findFreePort, isPortFree } from "./port-allocator.ts";

function listen(host: string): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen({ port: 0, host }, () => {
      const { port } = server.address() as net.AddressInfo;
      resolve({ port, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

test("a port held on 127.0.0.1 is reported busy, and free again after release", async () => {
  const held = await listen("127.0.0.1");
  assert.equal(await isPortFree(held.port), false);
  await held.close();
  assert.equal(await isPortFree(held.port), true);
});

test("a port held on all interfaces is reported busy", async () => {
  const held = await listen("0.0.0.0");
  assert.equal(await isPortFree(held.port), false);
  await held.close();
});

test("findFreePort skips busy and reserved ports", async () => {
  const held = await listen("127.0.0.1");
  const reserved = held.port + 1;
  const found = await findFreePort(held.port, { isReserved: (p) => p === reserved });
  assert.ok(found > reserved, `expected a port above ${reserved}, got ${found}`);
  await held.close();
});

test("findFreePort throws when the range is exhausted", async () => {
  await assert.rejects(findFreePort(4000, { isFree: async () => false, span: 5 }), /No free port found/);
});

test("invalid ports are never free", async () => {
  assert.equal(await isPortFree(0), false);
  assert.equal(await isPortFree(70000), false);
});
