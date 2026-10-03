import assert from "node:assert/strict";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension.
import { FloatingWindowRegistry, type FloatingPanel } from "./floating-window-registry.ts";

const panel = (panelId: string): FloatingPanel => ({ panelId, componentType: "project-tab", params: {}, title: panelId });

const setup = () => {
  const registry = new FloatingWindowRegistry<string>();
  registry.register("w1", "win-1");
  registry.register("w2", "win-2");
  return registry;
};

test("placing a panel into a window records its owner", () => {
  const registry = setup();
  assert.equal(registry.place("w1", panel("a")), undefined);
  assert.equal(registry.windowOf("a"), "w1");
  assert.deepEqual(registry.panelsOf("w1").map((p) => p.panelId), ["a"]);
});

test("moving a panel between windows removes it from the old one and reports the old window", () => {
  const registry = setup();
  registry.place("w1", panel("a"));
  registry.place("w1", panel("b"));
  assert.equal(registry.place("w2", panel("a")), "w1");
  assert.deepEqual(registry.panelsOf("w1").map((p) => p.panelId), ["b"]);
  assert.deepEqual(registry.panelsOf("w2").map((p) => p.panelId), ["a"]);
  assert.equal(registry.windowOf("a"), "w2");
});

test("placing a panel into the window that already holds it reports no move", () => {
  const registry = setup();
  registry.place("w1", panel("a"));
  assert.equal(registry.place("w1", panel("a")), undefined);
  assert.deepEqual(registry.panelsOf("w1").map((p) => p.panelId), ["a"]);
});

test("unplacing a panel returns its window and leaves the others in place", () => {
  const registry = setup();
  registry.place("w1", panel("a"));
  registry.place("w1", panel("b"));
  assert.equal(registry.unplace("a"), "w1");
  assert.equal(registry.windowOf("a"), undefined);
  assert.deepEqual(registry.panelsOf("w1").map((p) => p.panelId), ["b"]);
  assert.equal(registry.unplace("missing"), undefined);
});

test("dropping a window returns its remaining panels and frees their owners", () => {
  const registry = setup();
  registry.place("w1", panel("a"));
  registry.place("w1", panel("b"));
  assert.deepEqual(registry.drop("w1").map((p) => p.panelId), ["a", "b"]);
  assert.equal(registry.has("w1"), false);
  assert.equal(registry.windowOf("a"), undefined);
  assert.deepEqual(registry.drop("w1"), []);
});

test("placing into an unknown window throws", () => {
  const registry = setup();
  assert.throws(() => registry.place("nope", panel("a")), /Unknown floating window/);
});

test("panelsOf returns a copy", () => {
  const registry = setup();
  registry.place("w1", panel("a"));
  registry.panelsOf("w1").pop();
  assert.equal(registry.panelsOf("w1").length, 1);
});
