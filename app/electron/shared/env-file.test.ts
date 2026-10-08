import assert from "node:assert/strict";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension.
import { envEntries, formatEnvValue, parseEnv, serializeEnv } from "./env-file.ts";

const SAMPLE = [
  "# App",
  "NODE_ENV=staging",
  "export APP_URL='http://localhost:3001'  ",
  "",
  'GREETING="hello world" # inline',
  "EMPTY=",
  "NOTE=plain # a comment",
  'MULTI="line1',
  'line2"',
  "",
].join("\n");

test("parses values, quotes, exports, comments and multi-line values", () => {
  assert.deepEqual(envEntries(parseEnv(SAMPLE)), [
    { key: "NODE_ENV", value: "staging" },
    { key: "APP_URL", value: "http://localhost:3001" },
    { key: "GREETING", value: "hello world" },
    { key: "EMPTY", value: "" },
    { key: "NOTE", value: "plain" },
    { key: "MULTI", value: "line1\nline2" },
  ]);
});

test("saving unchanged entries reproduces the file byte for byte", () => {
  const parsed = parseEnv(SAMPLE);
  assert.equal(serializeEnv(parsed, envEntries(parsed)), SAMPLE);
});

test("edits in place, removes deleted keys and appends new ones, keeping comments", () => {
  const parsed = parseEnv(SAMPLE);
  const entries = envEntries(parsed)
    .filter((e) => e.key !== "EMPTY")
    .map((e) => (e.key === "APP_URL" ? { ...e, value: "http://localhost:3003" } : e));
  entries.push({ key: "NEW_KEY", value: "a b" });
  const out = serializeEnv(parsed, entries);
  assert.match(out, /^# App\nNODE_ENV=staging\nexport APP_URL=http:\/\/localhost:3003\n/);
  assert.doesNotMatch(out, /EMPTY=/);
  assert.match(out, /GREETING="hello world" # inline/);
  assert.match(out, /\n\nNEW_KEY="a b"\n$/);
  assert.deepEqual(envEntries(parseEnv(out)).find((e) => e.key === "MULTI"), { key: "MULTI", value: "line1\nline2" });
});

test("duplicate keys collapse to one line holding the effective (last) value", () => {
  const parsed = parseEnv("A=1\nB=2\nA=3\n");
  assert.deepEqual(envEntries(parsed), [{ key: "A", value: "3" }, { key: "B", value: "2" }]);
  assert.equal(serializeEnv(parsed, envEntries(parsed)), "A=3\nB=2\n");
});

test("keeps CRLF line endings", () => {
  const parsed = parseEnv("A=1\r\nB=2\r\n");
  assert.equal(serializeEnv(parsed, [{ key: "A", value: "9" }, { key: "B", value: "2" }]), "A=9\r\nB=2\r\n");
});

test("quotes values only when needed and round-trips them", () => {
  assert.equal(formatEnvValue("http://localhost:3000/api"), "http://localhost:3000/api");
  assert.equal(formatEnvValue(""), "");
  for (const value of ["a b", "has#hash", 'say "hi"', "back\\slash", "two\nlines", "it's"]) {
    const text = `K=${formatEnvValue(value)}\n`;
    assert.deepEqual(envEntries(parseEnv(text)), [{ key: "K", value }], text);
  }
});
