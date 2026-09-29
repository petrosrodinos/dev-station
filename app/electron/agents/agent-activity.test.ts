import assert from "node:assert/strict";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension.
import { ECHO_WINDOW_MS, isSubmit, resumesWork } from "./agent-activity.ts";

const idleAt = 10_000;

test("idle redraws without user input keep the agent idle", () => {
  assert.equal(resumesWork({ awaitingSince: idleAt, lastSubmitAt: 0, now: idleAt + 60_000, hinted: null }), false);
});

test("input submitted before the agent went idle does not count", () => {
  assert.equal(resumesWork({ awaitingSince: idleAt, lastSubmitAt: idleAt - 5_000, now: idleAt + 60_000, hinted: null }), false);
});

test("the echo right after a submit does not count as work", () => {
  const submit = idleAt + 5_000;
  assert.equal(resumesWork({ awaitingSince: idleAt, lastSubmitAt: submit, now: submit + ECHO_WINDOW_MS - 1, hinted: null }), false);
});

test("output after a submit means the agent is working again", () => {
  const submit = idleAt + 5_000;
  assert.equal(resumesWork({ awaitingSince: idleAt, lastSubmitAt: submit, now: submit + ECHO_WINDOW_MS + 500, hinted: null }), true);
});

test("an adapter's working signal resumes even without user input", () => {
  assert.equal(resumesWork({ awaitingSince: idleAt, lastSubmitAt: 0, now: idleAt + 1, hinted: "RUNNING" }), true);
});

test("only Enter counts as submitting", () => {
  assert.equal(isSubmit("fix the bug\r"), true);
  assert.equal(isSubmit("\x1b[200~prompt\x1b[201~\r"), true);
  assert.equal(isSubmit("a"), false);
  assert.equal(isSubmit("\x1b[A"), false);
});
