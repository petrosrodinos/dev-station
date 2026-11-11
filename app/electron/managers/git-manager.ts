import { execFile, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { CloneProgressEvent, GitBranch, GitCommitEntry, GitConflictFile, GitConflictSide, GitFileChange, GitFileState, GitOperation, GitStashEntry, GitStatus } from "../shared/contract";
import { IpcErrorCodes } from "../shared/contract";
import { IpcError } from "../ipc/ipc-error";

// Git Manager (Spec §19). Every call is `git` + an argument array (never a shell string),
// run in a validated project root. Destructive operations require an explicit confirm flag.

const MAX_BUFFER = 64 * 1024 * 1024;
const CONFLICT_STOP = "Sync stopped: there are merge conflicts. Resolve them in the Git tab, then sync again.";

interface RunOptions {
  allowExitCodes?: number[];
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

function run(cwd: string, args: string[], opts: RunOptions = {}): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd,
        maxBuffer: MAX_BUFFER,
        windowsHide: true,
        timeout: opts.timeoutMs ?? 120_000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C", ...opts.env },
      },
      (error, stdout, stderr) => {
        const code = error ? (typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number" ? ((error as unknown as { code: number }).code) : 1) : 0;
        if (error && !(opts.allowExitCodes ?? []).includes(code)) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return reject(new IpcError("Git is not installed or not on PATH.", IpcErrorCodes.GIT_FAILED));
          const message = (stderr || stdout || error.message).trim().split(/\r?\n/).slice(-6).join("\n");
          return reject(new IpcError(message || "Git command failed", IpcErrorCodes.GIT_FAILED));
        }
        resolve({ stdout, stderr, code });
      },
    );
  });
}

// Rejects control characters and the ref-format rules of `git check-ref-format --branch`.
// eslint-disable-next-line no-control-regex
const BRANCH_RE = /^(?!-)(?!.*\.\.)(?!.*[\s~^:?*[\\])(?!.*@\{)(?!.*\/\/)(?!.*\.lock$)[^\x00-\x1f\x7f]+(?<![./])$/;

function assertBranchName(name: string) {
  if (!BRANCH_RE.test(name) || name.length > 200) throw new IpcError(`Invalid branch name: ${name}`);
}

function assertSafeRef(ref: string) {
  if (ref.startsWith("-")) throw new IpcError("Invalid reference");
}

function normalizePaths(paths: string[]) {
  return paths.map((p) => {
    if (p.startsWith("-") || p.includes("\0") || path.isAbsolute(p) || p.split(/[\\/]/).includes("..")) throw new IpcError(`Invalid path: ${p}`);
    return p;
  });
}

function parseNumstat(out: string) {
  const map = new Map<string, { additions: number; deletions: number; binary: boolean }>();
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    const [a, d, ...rest] = line.split("\t");
    let file = rest.join("\t");
    const arrow = file.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
    if (arrow) file = `${arrow[1]}${arrow[3]}${arrow[4]}`.replace(/\/\//g, "/");
    else if (file.includes(" => ")) file = file.split(" => ")[1];
    const binary = a === "-" || d === "-";
    map.set(file, { additions: binary ? 0 : Number(a), deletions: binary ? 0 : Number(d), binary });
  }
  return map;
}

async function countLines(file: string): Promise<number> {
  try {
    const stat = await fs.promises.stat(file);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) return 0;
    const text = await fs.promises.readFile(file, "utf8");
    if (text.includes("\0")) return 0;
    return text ? text.split("\n").length - (text.endsWith("\n") ? 1 : 0) : 0;
  } catch {
    return 0;
  }
}

class GitManager {
  private clones = new Map<string, ChildProcess>();

  /**
   * Repository root for a project directory. A project may live in a monorepo sub-folder (Project.sub_path);
   * Git paths are always relative to the top-level, so every Git call runs there.
   */
  async toplevel(cwd: string): Promise<string> {
    try {
      const { stdout } = await run(cwd, ["rev-parse", "--show-toplevel"]);
      return path.resolve(stdout.trim()) || cwd;
    } catch {
      return cwd;
    }
  }

  async isRepo(cwd: string) {
    try {
      const { stdout } = await run(cwd, ["rev-parse", "--is-inside-work-tree"]);
      return stdout.trim() === "true";
    } catch {
      return false;
    }
  }

  async quickInfo(cwd: string) {
    const isRepo = await this.isRepo(cwd);
    if (!isRepo) return { is_repo: false, remote_url: null, branch: null };
    const [remote, branch] = await Promise.all([
      run(cwd, ["config", "--get", "remote.origin.url"], { allowExitCodes: [1] }).then((r) => r.stdout.trim() || null),
      run(cwd, ["branch", "--show-current"]).then((r) => r.stdout.trim() || null),
    ]);
    return { is_repo: true, remote_url: remote, branch };
  }

  async status(cwd: string): Promise<GitStatus> {
    const empty: GitStatus = {
      is_repo: false,
      branch: null,
      upstream: null,
      remotes: [],
      ahead: 0,
      behind: 0,
      commits: 0,
      detached: false,
      operation: null,
      files: [],
      counts: { modified: 0, added: 0, deleted: 0, untracked: 0, conflicted: 0, renamed: 0 },
      totals: { additions: 0, deletions: 0 },
    };
    if (!(await this.isRepo(cwd))) return empty;

    const [{ stdout }, remotes] = await Promise.all([
      run(cwd, ["status", "--porcelain=v2", "--branch", "--untracked-files=all", "-z"]),
      run(cwd, ["remote"]).then((r) => r.stdout.split(/\r?\n/).filter(Boolean)),
    ]);
    const result: GitStatus = { ...empty, is_repo: true, remotes, counts: { ...empty.counts }, totals: { ...empty.totals } };
    const entries = stdout.split("\0");
    const files: GitFileChange[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      if (entry.startsWith("# branch.head ")) {
        const head = entry.slice(14);
        result.detached = head === "(detached)";
        result.branch = result.detached ? null : head;
      } else if (entry.startsWith("# branch.upstream ")) {
        result.upstream = entry.slice(18);
      } else if (entry.startsWith("# branch.ab ")) {
        const m = entry.match(/\+(\d+) -(\d+)/);
        if (m) {
          result.ahead = Number(m[1]);
          result.behind = Number(m[2]);
        }
      } else if (entry.startsWith("1 ") || entry.startsWith("2 ")) {
        const parts = entry.split(" ");
        const xy = parts[1];
        const renamed = entry.startsWith("2 ");
        const filePath = renamed ? parts.slice(9).join(" ") : parts.slice(8).join(" ");
        const origPath = renamed ? entries[++i] : undefined;
        const code = xy[0] !== "." ? xy[0] : xy[1];
        let state: GitFileState = "M";
        if (renamed) state = "R";
        else if (code === "A") state = "A";
        else if (code === "D") state = "D";
        files.push({ path: filePath, orig_path: origPath, state, staged: xy[0] !== ".", additions: 0, deletions: 0, binary: false });
      } else if (entry.startsWith("u ")) {
        const parts = entry.split(" ");
        files.push({ path: parts.slice(10).join(" "), state: "C", staged: false, additions: 0, deletions: 0, binary: false });
      } else if (entry.startsWith("? ")) {
        files.push({ path: entry.slice(2), state: "U", staged: false, additions: 0, deletions: 0, binary: false });
      }
    }

    // Line stats against HEAD (staged + unstaged). A repo without commits has no HEAD.
    const hasHead = (await run(cwd, ["rev-parse", "--verify", "-q", "HEAD"], { allowExitCodes: [1] })).code === 0;
    const numstat = hasHead ? await run(cwd, ["diff", "HEAD", "--numstat", "-M"]) : await run(cwd, ["diff", "--cached", "--numstat"]);
    const stats = parseNumstat(numstat.stdout);
    if (hasHead) result.commits = Number((await run(cwd, ["rev-list", "--count", "HEAD"], { allowExitCodes: [1] })).stdout.trim()) || 0;

    await Promise.all(
      files.map(async (f) => {
        if (f.state === "U") {
          f.additions = await countLines(path.join(cwd, f.path));
          return;
        }
        const s = stats.get(f.path);
        if (s) Object.assign(f, s);
      }),
    );

    for (const f of files) {
      if (f.state === "M") result.counts.modified++;
      else if (f.state === "A") result.counts.added++;
      else if (f.state === "D") result.counts.deleted++;
      else if (f.state === "U") result.counts.untracked++;
      else if (f.state === "C") result.counts.conflicted++;
      else if (f.state === "R") result.counts.renamed++;
      result.totals.additions += f.additions;
      result.totals.deletions += f.deletions;
    }
    result.files = files.sort((a, b) => a.path.localeCompare(b.path));
    result.operation = await this.operation(cwd);
    return result;
  }

  /** The unfinished merge/rebase, if any (detected from the markers Git leaves in its directory). */
  async operation(cwd: string): Promise<GitOperation | null> {
    try {
      const { stdout } = await run(cwd, ["rev-parse", "--git-path", "MERGE_HEAD", "--git-path", "rebase-merge", "--git-path", "rebase-apply"]);
      const [merge, rebaseMerge, rebaseApply] = stdout.split(/\r?\n/).map((p) => path.resolve(cwd, p.trim()));
      if (fs.existsSync(rebaseMerge) || fs.existsSync(rebaseApply)) return "rebase";
      if (fs.existsSync(merge)) return "merge";
    } catch {
      /* not a repo */
    }
    return null;
  }

  private async conflictedPaths(cwd: string): Promise<string[]> {
    const { stdout } = await run(cwd, ["diff", "--name-only", "--diff-filter=U", "-z"]);
    return stdout.split("\0").filter(Boolean);
  }

  private async assertConflicted(cwd: string, file: string): Promise<string> {
    const [safe] = normalizePaths([file]);
    if (!(await this.conflictedPaths(cwd)).includes(safe)) throw new IpcError(`${safe} has no unresolved conflicts.`);
    return safe;
  }

  async conflictRead(cwd: string, file: string): Promise<GitConflictFile> {
    const safe = await this.assertConflicted(cwd, file);
    const abs = path.join(cwd, safe);
    const stat = await fs.promises.stat(abs).catch(() => null);
    // Deleted on one side: no working-tree file to merge by hand, the UI offers take-side only.
    if (!stat) return { content: "", binary: true, too_large: false };
    if (stat.size > 2 * 1024 * 1024) return { content: "", binary: false, too_large: true };
    const content = await fs.promises.readFile(abs, "utf8");
    return { content, binary: content.includes("\0"), too_large: false };
  }

  async conflictResolve(cwd: string, file: string, content: string) {
    const safe = await this.assertConflicted(cwd, file);
    if (/^(<{7}|>{7})( |$)/m.test(content)) throw new IpcError("The file still contains conflict markers. Resolve every conflict first.");
    await fs.promises.writeFile(path.join(cwd, safe), content, "utf8");
    await run(cwd, ["add", "--", safe]);
    return `Resolved ${safe}`;
  }

  async conflictTake(cwd: string, file: string, side: GitConflictSide) {
    const safe = await this.assertConflicted(cwd, file);
    const flag = side === "current" ? "--ours" : "--theirs";
    try {
      await run(cwd, ["checkout", flag, "--", safe]);
      await run(cwd, ["add", "--", safe]);
    } catch {
      // The chosen side deleted the file (or never had it): taking that side means removing it.
      await run(cwd, ["rm", "-f", "--", safe]);
    }
    return `Resolved ${safe}`;
  }

  async operationContinue(cwd: string, identity: { name?: string | null; email?: string | null }) {
    const op = await this.operation(cwd);
    if (!op) throw new IpcError("There is no merge or rebase in progress.");
    if ((await this.conflictedPaths(cwd)).length > 0) throw new IpcError("Resolve all conflicts before continuing.");
    const config: string[] = [];
    if (identity.name) config.push("-c", `user.name=${identity.name}`);
    if (identity.email) config.push("-c", `user.email=${identity.email}`);
    const env = { GIT_EDITOR: "true", GIT_MERGE_AUTOEDIT: "no" };
    try {
      const r = op === "merge" ? await run(cwd, [...config, "commit", "--no-edit"], { env }) : await run(cwd, [...config, "rebase", "--continue"], { env });
      return { done: (await this.operation(cwd)) === null, output: (r.stdout || r.stderr).trim() };
    } catch (e) {
      // A rebase stopping at its next conflicting commit is progress, not a failure.
      if (op === "rebase" && (await this.conflictedPaths(cwd)).length > 0) return { done: false, output: "Next commit has conflicts" };
      throw e;
    }
  }

  async operationAbort(cwd: string) {
    const op = await this.operation(cwd);
    if (!op) throw new IpcError("There is no merge or rebase in progress.");
    await run(cwd, [op === "merge" ? "merge" : "rebase", "--abort"]);
    return op === "merge" ? "Merge aborted" : "Rebase aborted";
  }

  /** Working-tree change summary vs HEAD — used to attach "changes produced" to agent sessions. */
  async changeSummary(cwd: string) {
    const s = await this.status(cwd);
    return { files_changed: s.files.length, additions: s.totals.additions, deletions: s.totals.deletions };
  }

  async fileDiff(cwd: string, file: string): Promise<string> {
    const [safe] = normalizePaths([file]);
    const tracked = (await run(cwd, ["ls-files", "--error-unmatch", "--", safe], { allowExitCodes: [1] })).code === 0;
    if (!tracked) {
      const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
      const { stdout } = await run(cwd, ["diff", "--no-index", "--no-color", "--", nullDevice, safe], { allowExitCodes: [1] });
      return stdout;
    }
    const hasHead = (await run(cwd, ["rev-parse", "--verify", "-q", "HEAD"], { allowExitCodes: [1] })).code === 0;
    const { stdout } = await run(cwd, hasHead ? ["diff", "HEAD", "--no-color", "-M", "--", safe] : ["diff", "--cached", "--no-color", "--", safe]);
    return stdout;
  }

  async branches(cwd: string): Promise<GitBranch[]> {
    const { stdout } = await run(cwd, [
      "for-each-ref",
      "--sort=-committerdate",
      "--format=%(refname)%1f%(refname:short)%1f%(HEAD)%1f%(upstream:short)%1f%(committerdate:relative)",
      "refs/heads",
      "refs/remotes",
    ]);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [full, short, head, upstream, date] = line.split("\x1f");
        return { name: short, remote: full.startsWith("refs/remotes/"), current: head === "*", upstream: upstream || null, last_commit: date || null };
      })
      .filter((b) => !(b.remote && b.name.endsWith("/HEAD")) && b.name !== "origin");
  }

  async log(cwd: string, limit = 20): Promise<GitCommitEntry[]> {
    const hasHead = (await run(cwd, ["rev-parse", "--verify", "-q", "HEAD"], { allowExitCodes: [1] })).code === 0;
    if (!hasHead) return [];
    const { stdout } = await run(cwd, ["log", `-n${Math.min(Math.max(limit, 1), 200)}`, "--pretty=format:%H%x1f%h%x1f%an%x1f%ar%x1f%s%x1e"]);
    return stdout
      .split("\x1e")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [sha, short, author, date, subject] = l.split("\x1f");
        return { sha, short_sha: short, author, relative_date: date, subject };
      });
  }

  async stashes(cwd: string): Promise<GitStashEntry[]> {
    const { stdout } = await run(cwd, ["stash", "list", "--format=%gd%x1f%s"]);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [ref, message] = l.split("\x1f");
        return { ref, message };
      });
  }

  async init(cwd: string) {
    if (await this.isRepo(cwd)) throw new IpcError("This folder is already a Git repository.");
    await run(cwd, ["init"]);
    return "Initialized Git repository";
  }

  /** Adds `origin`. Only https/ssh/scp-style URLs are accepted — never local paths, `ext::` helpers or option-like values. */
  async addRemote(cwd: string, url: string) {
    const trimmed = url.trim();
    if (!/^(https:\/\/[^\s/]+\/\S+|ssh:\/\/\S+|git@[^\s:]+:\S+)$/i.test(trimmed)) throw new IpcError("Enter an https://, ssh:// or git@host:path repository URL.");
    const existing = await run(cwd, ["remote"]).then((r) => r.stdout.split(/\r?\n/).filter(Boolean));
    if (existing.includes("origin")) throw new IpcError("This repository already has an 'origin' remote.");
    await run(cwd, ["remote", "add", "origin", "--", trimmed]);
    return `Added remote origin → ${trimmed}`;
  }

  async fetch(cwd: string) {
    const r = await run(cwd, ["fetch", "--all", "--prune"]);
    return (r.stderr || r.stdout).trim() || "Fetched";
  }

  async pull(cwd: string) {
    const r = await run(cwd, ["pull", "--ff-only"]);
    return (r.stdout || r.stderr).trim();
  }

  /**
   * VS Code-style sync: fetch, integrate remote commits (merge, or rebase when the user configured
   * pull.rebase), then push local commits. Dirty trees are auto-stashed around the integration.
   * On conflicts the merge/rebase is left in progress for the user to resolve, and nothing is pushed.
   */
  async sync(cwd: string): Promise<{ pulled: number; pushed: number; output: string }> {
    const initial = await this.status(cwd);
    if (!initial.branch) throw new IpcError("Cannot sync from a detached HEAD.");
    if (initial.operation || initial.counts.conflicted > 0) throw new IpcError("Finish the merge in progress (resolve conflicts, then Continue) before syncing.", IpcErrorCodes.GIT_FAILED);
    if (!initial.upstream) {
      // Never published: sync degenerates to publishing the branch.
      await this.push(cwd);
      return { pulled: 0, pushed: initial.ahead, output: "Published branch" };
    }

    await run(cwd, ["fetch", "--all", "--prune"]);
    const s = await this.status(cwd);
    let output = "";

    if (s.behind > 0) {
      const rebaseCfg = (await run(cwd, ["config", "--get", "pull.rebase"], { allowExitCodes: [1] })).stdout.trim();
      const mode = rebaseCfg && rebaseCfg !== "false" ? "--rebase" : "--no-rebase";
      const args = s.ahead > 0 || s.files.length > 0 ? ["pull", mode, "--autostash", "--no-edit"] : ["pull", "--ff-only"];
      try {
        output = (await run(cwd, args)).stdout.trim();
      } catch (e) {
        if ((await this.conflictedPaths(cwd)).length > 0) throw new IpcError(CONFLICT_STOP, IpcErrorCodes.GIT_FAILED);
        throw e;
      }
    }

    const after = await this.status(cwd);
    // An autostash that couldn't be re-applied cleanly leaves conflicts behind without failing the pull.
    if (after.counts.conflicted > 0 || after.operation) throw new IpcError(CONFLICT_STOP, IpcErrorCodes.GIT_FAILED);
    let pushed = 0;
    if (after.ahead > 0) {
      await run(cwd, ["push"], { timeoutMs: 300_000 });
      pushed = after.ahead;
    }
    return { pulled: s.behind, pushed, output };
  }

  async push(cwd: string) {
    const s = await this.status(cwd);
    if (!s.branch) throw new IpcError("Cannot push from a detached HEAD.");
    const args = s.upstream ? ["push"] : ["push", "--set-upstream", "origin", s.branch];
    const r = await run(cwd, args, { timeoutMs: 300_000 });
    const output = (r.stderr || r.stdout).trim() || "Pushed";
    // Git reports a no-op push via this exact message (localized builds aside) rather than a
    // distinct exit code, so it's the only reliable signal that nothing was actually sent.
    const pushed = !/up-to-date|up to date/i.test(output);
    return { pushed, output };
  }

  async commit(cwd: string, message: string, paths: string[] | undefined, identity: { name?: string | null; email?: string | null }) {
    if (!message.trim()) throw new IpcError("A commit message is required.");
    if ((await this.conflictedPaths(cwd)).length > 0) throw new IpcError("Resolve all merge conflicts before committing.");
    if (await this.operation(cwd)) throw new IpcError("A merge or rebase is in progress. Use Continue in the Git tab to finish it.");
    if (paths?.length) await run(cwd, ["add", "-A", "--", ...normalizePaths(paths)]);
    else await run(cwd, ["add", "-A"]);

    const config: string[] = [];
    if (identity.name) config.push("-c", `user.name=${identity.name}`);
    if (identity.email) config.push("-c", `user.email=${identity.email}`);
    const r = await run(cwd, [...config, "commit", "-m", message]);
    const sha = (await run(cwd, ["rev-parse", "HEAD"])).stdout.trim();
    return { sha, output: r.stdout.trim() };
  }

  async checkout(cwd: string, branch: string) {
    assertSafeRef(branch);
    const branches = await this.branches(cwd);
    const local = branches.find((b) => !b.remote && b.name === branch);
    if (local) return (await run(cwd, ["switch", branch])).stderr.trim() || `Switched to ${branch}`;
    const remote = branches.find((b) => b.remote && b.name === branch);
    if (remote) {
      const localName = branch.split("/").slice(1).join("/");
      assertBranchName(localName);
      if (branches.some((b) => !b.remote && b.name === localName)) return (await run(cwd, ["switch", localName])).stderr.trim();
      return (await run(cwd, ["switch", "--track", branch])).stderr.trim() || `Switched to ${localName}`;
    }
    throw new IpcError(`Branch not found: ${branch}`);
  }

  async createBranch(cwd: string, name: string, checkout: boolean) {
    assertBranchName(name);
    if (checkout) await run(cwd, ["switch", "-c", name]);
    else await run(cwd, ["branch", name]);
    return `Created ${name}`;
  }

  /** Plain rename (`git branch -m`, never forced). A branch with no commits yet can't be renamed by git, so its HEAD is re-pointed instead. */
  async renameBranch(cwd: string, from: string, to: string) {
    assertSafeRef(from);
    assertBranchName(to);
    if (from === to) return `Already named ${to}`;
    const branches = await this.branches(cwd);
    if (branches.some((b) => !b.remote && b.name === to)) throw new IpcError(`A branch named ${to} already exists.`);
    const current = (await run(cwd, ["branch", "--show-current"])).stdout.trim();
    const hasHead = (await run(cwd, ["rev-parse", "--verify", "-q", "HEAD"], { allowExitCodes: [1] })).code === 0;
    if (!hasHead && current === from) await run(cwd, ["symbolic-ref", "HEAD", `refs/heads/${to}`]);
    else await run(cwd, ["branch", "-m", from, to]);
    return `Renamed ${from} to ${to}`;
  }

  async merge(cwd: string, branch: string) {
    assertSafeRef(branch);
    const r = await run(cwd, ["merge", "--no-edit", branch]);
    return r.stdout.trim();
  }

  async stash(cwd: string, message?: string) {
    const args = ["stash", "push", "--include-untracked"];
    if (message) args.push("-m", message);
    const r = await run(cwd, args);
    return r.stdout.trim();
  }

  async stashPop(cwd: string, ref?: string) {
    if (ref && !/^stash@\{\d+\}$/.test(ref)) throw new IpcError("Invalid stash reference");
    const r = await run(cwd, ref ? ["stash", "pop", ref] : ["stash", "pop"]);
    return r.stdout.trim();
  }

  /** Discards working tree changes. Callers must pass confirm=true (UI confirmation happened). */
  async discard(cwd: string, paths: string[] | undefined, confirm: boolean) {
    if (!confirm) throw new IpcError("Discarding changes requires confirmation.");
    const hasHead = (await run(cwd, ["rev-parse", "--verify", "-q", "HEAD"], { allowExitCodes: [1] })).code === 0;
    if (!paths?.length) {
      if (hasHead) await run(cwd, ["reset", "--hard", "HEAD"]);
      await run(cwd, ["clean", "-fd"]);
      return "All changes discarded";
    }
    const safe = normalizePaths(paths);
    const status = await this.status(cwd);
    const untracked = safe.filter((p) => status.files.find((f) => f.path === p)?.state === "U");
    const tracked = safe.filter((p) => !untracked.includes(p));
    if (tracked.length && hasHead) await run(cwd, ["restore", "--source=HEAD", "--staged", "--worktree", "--", ...tracked]);
    if (untracked.length) await run(cwd, ["clean", "-f", "--", ...untracked]);
    return `Discarded ${safe.length} file${safe.length === 1 ? "" : "s"}`;
  }

  clone(operationId: string, url: string, destination: string, branch: string | null | undefined, onProgress: (e: CloneProgressEvent) => void): Promise<string> {
    if (!/^(https:\/\/|ssh:\/\/|git@[\w.-]+:)[^\s]+$/.test(url)) throw new IpcError("Only https:// and SSH repository URLs are supported.");
    const dest = path.resolve(destination);
    if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) throw new IpcError(`Destination is not empty: ${dest}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (branch) assertBranchName(branch);

    const args = ["clone", "--progress"];
    if (branch) args.push("--branch", branch);
    args.push("--", url, dest);

    return new Promise((resolve, reject) => {
      const child = spawn("git", args, { windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
      this.clones.set(operationId, child);
      let lastLine = "";
      const emit = (line: string, done = false, error: string | null = null) => {
        const pct = line.match(/(\d{1,3})%/);
        const stage = line.split(":")[0]?.trim() || "Cloning";
        onProgress({ operation_id: operationId, stage, percent: pct ? Number(pct[1]) : null, line, done, error, path: dest });
      };
      child.stderr?.on("data", (buf: Buffer) => {
        for (const part of buf.toString().split(/[\r\n]+/)) {
          if (!part.trim()) continue;
          lastLine = part.trim();
          emit(lastLine);
        }
      });
      child.on("error", (err) => {
        this.clones.delete(operationId);
        emit(err.message, true, err.message);
        reject(new IpcError(err.message, IpcErrorCodes.GIT_FAILED));
      });
      child.on("close", (code, signal) => {
        this.clones.delete(operationId);
        if (code === 0) {
          emit("Clone complete", true);
          resolve(dest);
        } else {
          const msg = signal ? "Clone cancelled" : lastLine || `git clone exited with ${code}`;
          emit(msg, true, msg);
          if (signal) fs.rmSync(dest, { recursive: true, force: true });
          reject(new IpcError(msg, IpcErrorCodes.GIT_FAILED));
        }
      });
    });
  }

  cancelClone(operationId: string) {
    this.clones.get(operationId)?.kill();
  }
}

export const gitManager = new GitManager();
