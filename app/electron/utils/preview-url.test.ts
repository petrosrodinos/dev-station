import assert from "node:assert/strict";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension; tsc does not allow it.
// @ts-expect-error TS5097
import { isPreviewUrlAllowed } from "./preview-url.ts";

test("allows localhost and 127.0.0.1 over http(s) with any port", () => {
  assert.equal(isPreviewUrlAllowed("http://localhost:3000/x"), true);
  assert.equal(isPreviewUrlAllowed("https://127.0.0.1:5173"), true);
  assert.equal(isPreviewUrlAllowed("http://localhost"), true);
});

test("rejects lookalike hosts, userinfo tricks, other schemes and garbage", () => {
  assert.equal(isPreviewUrlAllowed("http://localhost.evil.com"), false);
  assert.equal(isPreviewUrlAllowed("http://localhost@evil.com"), false);
  assert.equal(isPreviewUrlAllowed("http://user:pw@localhost:3000"), false);
  assert.equal(isPreviewUrlAllowed("http://evil.com/localhost"), false);
  assert.equal(isPreviewUrlAllowed("file:///"), false);
  assert.equal(isPreviewUrlAllowed("javascript:alert(1)"), false);
  assert.equal(isPreviewUrlAllowed("not a url"), false);
});
