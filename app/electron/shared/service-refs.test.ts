import assert from "node:assert/strict";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension.
import { appendScriptArgs, assignServiceSlugs, envTemplateFor, portFlagFor, referencedSlugs, resolveTemplate, slugify, type TemplateContext } from "./service-refs.ts";

const ctx = (): TemplateContext => ({
  self: "web",
  services: new Map([
    ["web", { name: "Web", port: 5174 }],
    ["api", { name: "Api", port: 3001 }],
    ["db", { name: "Db", port: null }],
  ]),
});

test("slugs are lowercase, dashed and unique", () => {
  assert.equal(slugify("Api Server"), "api-server");
  assert.equal(slugify("***"), "service");
  assert.deepEqual(assignServiceSlugs(["Api", "API", "Web", "api"]), ["api", "api-2", "web", "api-3"]);
});

test("resolves port, url and host references to the allocated port", () => {
  const r = resolveTemplate("{{api.url}}/v1 {{ api.port }} {{api.host}}", ctx());
  assert.equal(r.value, "http://localhost:3001/v1 3001 localhost:3001");
  assert.deepEqual(r.refs, ["api"]);
  assert.deepEqual(r.errors, []);
});

test("URL-valued env vars turn host references into full URLs", () => {
  assert.equal(envTemplateFor("NEXT_PUBLIC_API_URL", "{{api.host}}"), "{{api.url}}");
  assert.equal(envTemplateFor("APP_URL", "{{ app.host }}/x"), "{{app.url}}/x");
  assert.equal(envTemplateFor("CORS_URLS", "{{web.host}},{{api.host}}"), "{{web.url}},{{api.url}}");
  assert.equal(envTemplateFor("ALLOWED_ORIGIN", "{{host}}"), "{{url}}");
  assert.equal(envTemplateFor("APP_URL", "http://{{app.host}}"), "http://{{app.host}}");
  assert.equal(envTemplateFor("API_HOST", "{{api.host}}"), "{{api.host}}");
  assert.equal(envTemplateFor("CURLY", "{{api.host}}"), "{{api.host}}");
  assert.equal(resolveTemplate(envTemplateFor("NEXT_PUBLIC_API_URL", "{{api.host}}"), ctx()).value, "http://localhost:3001");
});

test("bare references use the service itself and are not dependencies", () => {
  const r = resolveTemplate("vite --port {{port}} --origin {{url}}", ctx());
  assert.equal(r.value, "vite --port 5174 --origin http://localhost:5174");
  assert.deepEqual(r.refs, []);
});

test("reports unknown services, unknown fields and services without a port", () => {
  assert.match(resolveTemplate("{{nope.port}}", ctx()).errors[0], /Unknown service "nope"/);
  assert.match(resolveTemplate("{{api.prot}}", ctx()).errors[0], /Unknown field "prot"/);
  assert.match(resolveTemplate("{{db.port}}", ctx()).errors[0], /"Db" has no port/);
});

test("leaves foreign templates such as docker's Go templates alone", () => {
  const r = resolveTemplate("docker ps --format '{{.Names}} {{Names}}'", ctx());
  assert.equal(r.value, "docker ps --format '{{.Names}} {{Names}}'");
  assert.deepEqual(r.errors, []);
});

test("referencedSlugs lists only other-service references", () => {
  assert.deepEqual(referencedSlugs("{{api.url}} {{port}} {{db.host}} {{api.port}}").sort(), ["api", "db"]);
});

test("port flags for dev servers that ignore PORT", () => {
  assert.equal(portFlagFor("vite", 5174), "--port 5174 --strictPort");
  assert.equal(portFlagFor("next dev", 3001), "-p 3001");
  assert.equal(portFlagFor("storybook dev", 6007), "-p 6007");
  assert.equal(portFlagFor("ng serve", 4201), "--port 4201");
  assert.equal(portFlagFor("nest start --watch", 3001), ""); // reads PORT
});

test("a pinned port is overridden by an appended flag where the last flag wins", () => {
  assert.equal(portFlagFor("vite --port 4000", 5174), "--port 5174 --strictPort");
  assert.equal(portFlagFor("next dev -p 3001", 3003), "-p 3003");
  assert.equal(portFlagFor("PORT=4000 next dev", 3001), "-p 3001");
});

test("no port flag when an unknown script pins a port or the script fans out", () => {
  assert.equal(portFlagFor("ng serve --port 4200", 4201), "");
  assert.equal(portFlagFor("node server.js --port 4000", 3001), "");
  assert.equal(portFlagFor("turbo dev", 3001), "");
  assert.equal(portFlagFor("vite build && vite preview", 3001), "");
});

test("script args are passed after -- for npm only", () => {
  assert.equal(appendScriptArgs("npm run dev", "npm", "-p 1"), "npm run dev -- -p 1");
  assert.equal(appendScriptArgs("pnpm run dev", "pnpm", "-p 1"), "pnpm run dev -p 1");
  assert.equal(appendScriptArgs("yarn dev", "yarn", "-p 1"), "yarn dev -p 1");
  assert.equal(appendScriptArgs("npm run dev", "npm", ""), "npm run dev");
});
