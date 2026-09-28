import fs from "node:fs";
import path from "node:path";
import type { DetectedPackage, DetectedService, DetectionResult, PackageManager } from "../shared/contract";
import { assignServiceSlugs } from "../shared/service-refs";
import { toPosix } from "../utils/platform";
import { gitManager } from "./git-manager";

// Automatic project detection (Spec §8). Reads manifests only — never executes anything.

const MAX_PACKAGES = 60;

const FRAMEWORK_DEPS: [string, string][] = [
  ["next", "Next.js"],
  ["@nestjs/core", "NestJS"],
  ["vite", "Vite"],
  ["react", "React"],
  ["vue", "Vue"],
  ["svelte", "Svelte"],
  ["@angular/core", "Angular"],
  ["astro", "Astro"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["electron", "Electron"],
  ["storybook", "Storybook"],
  ["@storybook/react", "Storybook"],
  ["prisma", "Prisma"],
];

const SERVICE_SCRIPTS = ["dev", "start:dev", "start", "serve", "storybook", "worker", "dev:worker", "start:worker"];

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function exists(root: string, rel: string) {
  return fs.existsSync(path.join(root, rel));
}

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  packageManager?: string;
}

function detectPackageManager(root: string, pkg: PackageJson | null): PackageManager | null {
  const declared = pkg?.packageManager?.split("@")[0];
  if (declared === "pnpm" || declared === "yarn" || declared === "npm" || declared === "bun") return declared;
  if (exists(root, "pnpm-lock.yaml") || exists(root, "pnpm-workspace.yaml")) return "pnpm";
  if (exists(root, "yarn.lock")) return "yarn";
  if (exists(root, "bun.lockb") || exists(root, "bun.lock")) return "bun";
  if (exists(root, "package-lock.json") || pkg) return "npm";
  return null;
}

/** Expands simple workspace globs (`apps/*`, `packages/**`, `tools/cli`). */
function expandWorkspaceGlobs(root: string, patterns: string[]): string[] {
  const dirs = new Set<string>();
  for (const raw of patterns) {
    const pattern = raw.replace(/^\.\//, "").replace(/\/$/, "");
    if (pattern.startsWith("!")) continue;
    const star = pattern.indexOf("*");
    if (star === -1) {
      if (exists(root, path.join(pattern, "package.json"))) dirs.add(pattern);
      continue;
    }
    const base = pattern.slice(0, star).replace(/\/$/, "");
    const baseAbs = path.join(root, base);
    if (!fs.existsSync(baseAbs)) continue;
    for (const entry of fs.readdirSync(baseAbs, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (exists(root, path.join(rel, "package.json"))) dirs.add(rel);
    }
  }
  return [...dirs].slice(0, MAX_PACKAGES);
}

function pnpmWorkspaceGlobs(root: string): string[] {
  try {
    const text = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
    return text
      .split(/\r?\n/)
      .map((l) => l.match(/^\s*-\s*['"]?([^'"#]+)['"]?/)?.[1]?.trim())
      .filter((v): v is string => !!v);
  } catch {
    return [];
  }
}

/** Common app folders scanned when the repo is not a declared workspace (e.g. `app/` + `api/` side by side). */
function conventionalDirs(root: string): string[] {
  const out: string[] = [];
  for (const entry of safeReaddir(root)) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
    if (exists(root, path.join(entry.name, "package.json"))) out.push(entry.name);
  }
  return out.slice(0, MAX_PACKAGES);
}

function safeReaddir(dir: string) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function frameworksOf(pkg: PackageJson): string[] {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const found = new Set<string>();
  for (const [dep, label] of FRAMEWORK_DEPS) if (deps[dep]) found.add(label);
  return [...found];
}

function inferKind(script: string, frameworks: string[], dirName: string): DetectedService["kind"] {
  const dir = dirName.toLowerCase();
  if (script.includes("storybook")) return "STORYBOOK";
  if (script.includes("worker") || dir.includes("worker")) return "WORKER";
  if (frameworks.includes("NestJS") || frameworks.includes("Express") || frameworks.includes("Fastify") || /(^|\/)(api|server|backend)$/.test(dir)) return "API";
  if (frameworks.some((f) => ["Next.js", "Vite", "React", "Vue", "Svelte", "Angular", "Astro"].includes(f))) return "FRONTEND";
  return "OTHER";
}

function inferPort(script: string, command: string, frameworks: string[]): number | null {
  const explicit = command.match(/(?:--port[ =]|-p\s+|PORT=)(\d{2,5})/);
  if (explicit) return Number(explicit[1]);
  if (script.includes("storybook")) return 6006;
  if (frameworks.includes("Vite")) return 5173;
  if (frameworks.includes("Next.js")) return 3000;
  if (frameworks.includes("Angular")) return 4200;
  if (frameworks.includes("Astro")) return 4321;
  if (frameworks.includes("NestJS") || frameworks.includes("Express")) return 3000;
  return null;
}

function pickServiceScripts(scripts: Record<string, string>): string[] {
  const picked: string[] = [];
  if (scripts.dev) picked.push("dev");
  else if (scripts["start:dev"]) picked.push("start:dev");
  else if (scripts.start) picked.push("start");
  else if (scripts.serve) picked.push("serve");
  for (const s of SERVICE_SCRIPTS) if (scripts[s] && (s.includes("storybook") || s.includes("worker")) && !picked.includes(s)) picked.push(s);
  return picked;
}

const ENV_FILES = [".env", ".env.development", ".env.local", ".env.development.local"];
const LOCAL_REF_RE = /(https?:\/\/)?(?:localhost|127\.0\.0\.1):(\d{2,5})/g;
const MAX_SUGGESTED_ENV = 20;

function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    out[m[1]] = value;
  }
  return out;
}

/**
 * Finds `.env` values that point at a sibling service (`VITE_API_URL=http://localhost:3000`) and suggests the
 * reference form (`{{api.url}}`), so the value follows that service if its port has to change.
 */
function suggestEnvReferences(root: string, services: DetectedService[]) {
  const slugs = assignServiceSlugs(services.map((s) => s.name));
  services.forEach((svc, index) => {
    if (!svc.script && !svc.command) return;
    const values: Record<string, string> = {};
    for (const f of ENV_FILES) Object.assign(values, readEnvFile(path.join(root, svc.cwd, f)));

    const suggestions: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === "PORT") continue;
      const replaced = value.replace(LOCAL_REF_RE, (whole, proto: string | undefined, portStr: string) => {
        if (proto && proto !== "http://") return whole;
        const port = Number(portStr);
        const candidates = services.map((other, i) => ({ other, i })).filter(({ other, i }) => i !== index && other.port === port);
        const target = candidates.find(({ other }) => other.kind === "API") ?? candidates[0];
        if (!target) return whole;
        return `{{${slugs[target.i]}.${proto ? "url" : "host"}}}`;
      });
      if (replaced !== value) suggestions[key] = replaced;
    }
    const keys = Object.keys(suggestions).slice(0, MAX_SUGGESTED_ENV);
    svc.env = keys.length ? Object.fromEntries(keys.map((k) => [k, suggestions[k]])) : null;
  });
}

function titleCase(s: string) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function inspect(root: string): Promise<DetectionResult> {
  const rootPkg = readJson<PackageJson>(path.join(root, "package.json"));
  const packageManager = detectPackageManager(root, rootPkg);

  const monorepoTools: string[] = [];
  if (exists(root, "pnpm-workspace.yaml")) monorepoTools.push("pnpm workspaces");
  if (rootPkg?.workspaces) monorepoTools.push(`${packageManager ?? "npm"} workspaces`);
  if (exists(root, "turbo.json")) monorepoTools.push("Turborepo");
  if (exists(root, "nx.json")) monorepoTools.push("Nx");
  if (exists(root, "lerna.json")) monorepoTools.push("Lerna");

  const composeFiles = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"].filter((f) => exists(root, f));
  const hasDocker = exists(root, "Dockerfile") || composeFiles.length > 0;

  const languages = new Set<string>();
  if (rootPkg || exists(root, "tsconfig.json")) languages.add(exists(root, "tsconfig.json") ? "TypeScript" : "JavaScript");
  const isPython = ["pyproject.toml", "requirements.txt", "Pipfile", "manage.py", "setup.py"].some((f) => exists(root, f));
  if (isPython) languages.add("Python");
  if (exists(root, "go.mod")) languages.add("Go");
  if (exists(root, "Cargo.toml")) languages.add("Rust");

  // Package directories: declared workspaces first, then conventional sibling apps.
  const workspaceGlobs = [
    ...pnpmWorkspaceGlobs(root),
    ...(Array.isArray(rootPkg?.workspaces) ? rootPkg.workspaces : rootPkg?.workspaces?.packages ?? []),
  ];
  let packageDirs = workspaceGlobs.length ? expandWorkspaceGlobs(root, workspaceGlobs) : [];
  if (!packageDirs.length) packageDirs = conventionalDirs(root);

  const packages: DetectedPackage[] = [];
  const services: DetectedService[] = [];

  const addPackage = (rel: string, pkg: PackageJson) => {
    const frameworks = frameworksOf(pkg);
    for (const f of frameworks) languages.add(f === "NestJS" || f === "Next.js" ? "TypeScript" : "JavaScript");
    const scripts = pkg.scripts ?? {};
    packages.push({ name: pkg.name ?? (rel === "." ? path.basename(root) : rel), path: rel, frameworks, scripts });

    // Workspace members share the root package manager; independent sibling apps keep their own lockfile.
    const dirPm = rel === "." || workspaceGlobs.length ? packageManager : detectPackageManager(path.join(root, rel), pkg) ?? packageManager;
    for (const script of pickServiceScripts(scripts)) {
      const kind = inferKind(script, frameworks, rel === "." ? path.basename(root) : rel);
      const port = inferPort(script, scripts[script] ?? "", frameworks);
      const base = rel === "." ? (pkg.name ? titleCase(pkg.name.replace(/^@[^/]+\//, "")) : "App") : titleCase(path.basename(rel));
      services.push({
        name: script === "dev" || script === "start" || script === "start:dev" || script === "serve" ? base : `${base} ${titleCase(script)}`,
        kind,
        cwd: rel,
        package_manager: dirPm,
        script,
        command: null,
        port,
        url: port ? `http://localhost:${port}` : null,
      });
    }
  };

  // In a declared monorepo the root dev script usually fans out (turbo dev); only use it if no package has one.
  for (const rel of packageDirs) {
    const pkg = readJson<PackageJson>(path.join(root, rel, "package.json"));
    if (pkg) addPackage(toPosix(rel), pkg);
  }
  if (rootPkg && (!services.length || !workspaceGlobs.length)) {
    const before = services.length;
    addPackage(".", rootPkg);
    // Avoid duplicating a root "dev" that just proxies to the child apps we already found.
    if (before > 0 && workspaceGlobs.length) services.splice(before);
  }

  if (composeFiles.length) {
    services.push({ name: "Docker Compose", kind: "DATABASE", cwd: ".", package_manager: null, script: null, command: `docker compose -f ${composeFiles[0]} up`, port: null, url: null });
  }
  if (isPython && exists(root, "manage.py")) {
    services.push({ name: "Django", kind: "API", cwd: ".", package_manager: null, script: null, command: "python manage.py runserver", port: 8000, url: "http://localhost:8000" });
  }

  suggestEnvReferences(root, services);

  const gitInfo = await gitManager.quickInfo(root);

  return {
    root,
    package_manager: packageManager,
    monorepo_tools: monorepoTools,
    has_docker: hasDocker,
    docker_compose_files: composeFiles,
    languages: [...languages],
    packages,
    services,
    git: gitInfo,
  };
}
