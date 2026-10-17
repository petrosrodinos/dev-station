import assert from "node:assert/strict";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension.
import { buildRgArgs, normalizeRgPath, parseRgMatch, rgReplacement } from "./content-search.ts";

const base = { query: "foo", regex: false, caseSensitive: false, wholeWord: false, include: "", exclude: "" };

test("builds literal, case-insensitive args by default and ends with the pattern", () => {
  const args = buildRgArgs(base);
  assert.ok(args.includes("--fixed-strings") && args.includes("--ignore-case"));
  assert.deepEqual(args.slice(-2), ["--regexp", "foo"]);
  assert.ok(!args.includes("--word-regexp"));
});

test("regex, case and whole-word options map to flags", () => {
  const args = buildRgArgs({ ...base, regex: true, caseSensitive: true, wholeWord: true });
  assert.ok(!args.includes("--fixed-strings") && args.includes("--case-sensitive") && args.includes("--word-regexp"));
});

test("user globs come after the default ignores so they can override them; excludes are negated", () => {
  const args = buildRgArgs({ ...base, include: "src/**, *.ts", exclude: "**/*.test.ts" });
  const globs = args.filter((_, i) => args[i - 1] === "--glob");
  assert.ok(globs.indexOf("!node_modules") < globs.indexOf("src/**"));
  assert.deepEqual(globs.slice(-3), ["src/**", "*.ts", "!**/*.test.ts"]);
});

test("literal replacements escape $ so rg does not read capture groups", () => {
  assert.equal(rgReplacement("a$1", false), "a$$1");
  assert.equal(rgReplacement("a$1", true), "a$1");
});

test("parses a match event, converting UTF-8 byte offsets to character columns", () => {
  const line = "é foo\r\n";
  const event = { type: "match", data: { path: { text: ".\\src\\a.ts" }, lines: { text: line }, line_number: 7, submatches: [{ match: { text: "foo" }, start: 3, end: 6 }] } };
  const parsed = parseRgMatch(JSON.stringify(event));
  assert.equal(parsed?.path, "src/a.ts");
  assert.deepEqual(parsed?.matches[0], { line: 7, column: 2, length: 3, preview: "é foo", previewStart: 2 });
});

test("ignores other events and non-UTF-8 lines", () => {
  assert.equal(parseRgMatch('{"type":"begin","data":{}}'), null);
  assert.equal(parseRgMatch('{"type":"match","data":{"path":{"text":"a"},"lines":{"bytes":"AAE="},"line_number":1,"submatches":[]}}'), null);
  assert.equal(normalizeRgPath("./a/b"), "a/b");
});
