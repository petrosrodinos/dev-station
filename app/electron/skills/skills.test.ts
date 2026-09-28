import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
// Node's type-stripping runner needs the explicit extension.
import { buildSkillText, toTerminalInput } from "./skill-format.ts";
import { parseFrontmatter, parseGeminiToml, parseMarkdownSkill, stripSkillExtension } from "./skill-parsers.ts";
import { scanSkills } from "./skill-scanner.ts";

test("frontmatter: scalars, quotes, block scalars, lists", () => {
  const { meta, body } = parseFrontmatter(
    ['---', 'name: my-skill', 'description: "Does a thing: well"', 'globs: ["*.ts", "*.tsx"]', 'allowed-tools:', '  - Read', '  - Grep', 'notes: >', '  first', '  second', '---', '# Title', 'Body'].join("\n"),
  );
  assert.equal(meta.name, "my-skill");
  assert.equal(meta.description, "Does a thing: well");
  assert.equal(meta.globs, "*.ts, *.tsx");
  assert.equal(meta["allowed-tools"], "Read, Grep");
  assert.equal(meta.notes, "first second");
  assert.equal(body, "# Title\nBody");
});

test("frontmatter: no block means whole file is the body; CRLF works", () => {
  assert.deepEqual(parseFrontmatter("# Just text"), { meta: {}, body: "# Just text" });
  assert.equal(parseFrontmatter("---\r\nname: x\r\n---\r\nhi").meta.name, "x");
});

test("markdown skill falls back to file name and first heading", () => {
  const parsed = parseMarkdownSkill("# Deploy steps\nrun it", "deploy");
  assert.equal(parsed.name, "deploy");
  assert.equal(parsed.description, "Deploy steps");
});

test("gemini toml: multi-line prompt and description", () => {
  const parsed = parseGeminiToml('description = "Review code"\nprompt = """\nLook at {{args}}\nand report\n"""\n', "review");
  assert.equal(parsed?.description, "Review code");
  assert.equal(parsed?.body, "Look at {{args}}\nand report\n");
  assert.equal(parseGeminiToml("nothing = 1", "x"), null);
});

test("stripSkillExtension", () => {
  assert.equal(stripSkillExtension("a.prompt.md"), "a");
  assert.equal(stripSkillExtension("rule.mdc"), "rule");
});

test("send text: content is bracketed-pasted without submit by default, control chars stripped", () => {
  const text = buildSkillText({ name: "s", kind: "skill", path: "/p/SKILL.md", body: "line1\r\nline2\x1b[31m" }, "content");
  assert.ok(text.includes("line1\nline2[31m"));
  assert.ok(!text.includes("\x1b"));
  const input = toTerminalInput(text, false);
  assert.ok(input.startsWith("\x1b[200~") && input.endsWith("\x1b[201~"));
  assert.ok(toTerminalInput("x", true).endsWith("\x1b[201~\r"));
  assert.match(buildSkillText({ name: "s", kind: "skill", path: "/p/SKILL.md", body: "b" }, "reference"), /\/p\/SKILL\.md/);
});

test("scanner finds every provider format across user, project and custom locations", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skills-"));
  const w = (rel: string, content: string) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  w("home/.claude/skills/alpha/SKILL.md", "---\nname: alpha\ndescription: A\n---\nbody");
  w("home/.codex/prompts/fix.md", "fix it");
  w("home/.gemini/commands/git/commit.toml", 'prompt = "commit"');
  w("proj/.cursor/rules/style.mdc", "---\ndescription: style\nalwaysApply: true\n---\nrules");
  w("proj/.agents/skills/beta/SKILL.md", "beta body");
  w("proj/AGENTS.md", "# Agents");
  w("proj/.github/prompts/plan.prompt.md", "plan");
  w("custom/notes/tips.md", "# Tips");
  w("custom/README.md", "ignored");
  w("custom/deep/gamma/SKILL.md", "gamma");

  const { entries } = scanSkills({ home: path.join(root, "home"), projectRoot: path.join(root, "proj"), customFolders: [path.join(root, "custom")] });
  const by = (n: string) => entries.find((e: { summary: { name: string } }) => e.summary.name === n)?.summary;
  assert.equal(by("alpha")?.provider, "claude");
  assert.equal(by("fix")?.provider, "codex");
  assert.equal(by("git:commit")?.provider, "gemini");
  assert.equal(by("style")?.kind, "rule");
  assert.equal(by("style")?.meta.alwaysApply, "true");
  assert.equal(by("beta")?.scope, "project");
  assert.equal(by("AGENTS")?.kind, "context");
  assert.equal(by("plan")?.provider, "copilot");
  assert.equal(by("tips")?.scope, "custom");
  assert.equal(by("gamma")?.kind, "skill");
  assert.equal(by("README"), undefined);
  fs.rmSync(root, { recursive: true, force: true });
});
